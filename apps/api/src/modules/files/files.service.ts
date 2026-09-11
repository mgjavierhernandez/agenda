import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { StorageProvider } from './interfaces/storage-provider.interface';
import { STORAGE_PROVIDER } from './storage/tokens';
import { FileAsset, FileAssetStatus } from '@prisma/client';

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export const MAX_FILE_SIZE_MB = 10;
export const MAX_TASK_ATTACHMENTS = 10;
export const MAX_COMMUNICATION_ATTACHMENTS = 10;

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: StorageProvider,
    private readonly configService: ConfigService,
  ) {}

  private getMaxFileSizeBytes(): number {
    const maxMb = this.configService.get<number>('FILE_MAX_SIZE_MB', MAX_FILE_SIZE_MB);
    return maxMb * 1024 * 1024;
  }

  private getMaxTaskAttachments(): number {
    return this.configService.get<number>('MAX_TASK_ATTACHMENTS', MAX_TASK_ATTACHMENTS);
  }

  private getMaxCommunicationAttachments(): number {
    return this.configService.get<number>(
      'MAX_COMMUNICATION_ATTACHMENTS',
      MAX_COMMUNICATION_ATTACHMENTS,
    );
  }

  async uploadFile(
    institutionId: string,
    userId: string,
    file: Express.Multer.File,
    ipAddress?: string,
  ): Promise<FileAsset> {
    if (!file || file.size === 0) {
      throw new BadRequestException('File is empty');
    }

    if (file.size > this.getMaxFileSizeBytes()) {
      throw new BadRequestException(
        `File exceeds maximum size of ${this.configService.get<number>('FILE_MAX_SIZE_MB', MAX_FILE_SIZE_MB)}MB`,
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`MIME type "${file.mimetype}" is not allowed`);
    }

    const storageResult = await this.storageProvider.upload(
      institutionId,
      file.originalname,
      file.mimetype,
      file.buffer,
    );

    const fileAsset = await this.prisma.fileAsset.create({
      data: {
        institutionId,
        originalName: file.originalname,
        storageKey: storageResult.storageKey,
        mimeType: file.mimetype,
        sizeBytes: storageResult.sizeBytes,
        checksum: storageResult.checksum,
        uploadedByUserId: userId,
        status: FileAssetStatus.ACTIVE,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'FILE_UPLOADED',
      entityType: 'FileAsset',
      entityId: fileAsset.id,
      newValues: {
        originalName: fileAsset.originalName,
        mimeType: fileAsset.mimeType,
        sizeBytes: fileAsset.sizeBytes,
        checksum: fileAsset.checksum,
      },
      ipAddress,
    });

    return fileAsset;
  }

  async findOne(institutionId: string, fileAssetId: string): Promise<FileAsset> {
    const fileAsset = await this.prisma.fileAsset.findFirst({
      where: { id: fileAssetId, institutionId, status: FileAssetStatus.ACTIVE },
    });
    if (!fileAsset) {
      throw new NotFoundException('File not found');
    }
    return fileAsset;
  }

  async getDownloadStream(
    institutionId: string,
    fileAssetId: string,
  ): Promise<{ stream: import('stream').Readable; fileAsset: FileAsset }> {
    const fileAsset = await this.findOne(institutionId, fileAssetId);
    const stream = await this.storageProvider.read(fileAsset.storageKey);
    return { stream, fileAsset };
  }

  async deleteFile(
    institutionId: string,
    fileAssetId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<void> {
    const fileAsset = await this.findOne(institutionId, fileAssetId);

    const hasTaskAttachment = await this.prisma.taskAttachment.findFirst({
      where: { fileAssetId, institutionId },
    });
    const hasCommAttachment = await this.prisma.communicationAttachment.findFirst({
      where: { fileAssetId, institutionId },
    });

    if (hasTaskAttachment || hasCommAttachment) {
      await this.prisma.fileAsset.update({
        where: { id: fileAssetId },
        data: { status: FileAssetStatus.DELETED },
      });
    } else {
      await this.prisma.fileAsset.delete({ where: { id: fileAssetId } });
      await this.storageProvider.delete(fileAsset.storageKey);
    }

    await this.auditService.log({
      userId,
      institutionId,
      action: 'FILE_DELETED',
      entityType: 'FileAsset',
      entityId: fileAssetId,
      oldValues: { originalName: fileAsset.originalName, storageKey: fileAsset.storageKey },
      ipAddress,
    });
  }

  async createTaskAttachment(
    institutionId: string,
    taskId: string,
    fileAssetId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, institutionId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const fileAsset = await this.findOne(institutionId, fileAssetId);

    const attachmentCount = await this.prisma.taskAttachment.count({
      where: { taskId, institutionId },
    });
    if (attachmentCount >= this.getMaxTaskAttachments()) {
      throw new BadRequestException(
        `Task cannot have more than ${this.getMaxTaskAttachments()} attachments`,
      );
    }

    const existing = await this.prisma.taskAttachment.findUnique({
      where: { taskId_fileAssetId: { taskId, fileAssetId } },
    });
    if (existing) {
      throw new BadRequestException('File is already attached to this task');
    }

    const attachment = await this.prisma.taskAttachment.create({
      data: { institutionId, taskId, fileAssetId },
      include: { fileAsset: true },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'TASK_ATTACHMENT_CREATED',
      entityType: 'TaskAttachment',
      entityId: attachment.id,
      newValues: { taskId, fileAssetId, originalName: fileAsset.originalName },
      ipAddress,
    });

    return attachment;
  }

  async listTaskAttachments(institutionId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, institutionId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.taskAttachment.findMany({
      where: { taskId, institutionId },
      include: { fileAsset: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteTaskAttachment(
    institutionId: string,
    taskId: string,
    attachmentId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const attachment = await this.prisma.taskAttachment.findFirst({
      where: { id: attachmentId, taskId, institutionId },
      include: { fileAsset: true },
    });
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    await this.prisma.taskAttachment.delete({ where: { id: attachmentId } });

    const otherTaskRefs = await this.prisma.taskAttachment.count({
      where: { fileAssetId: attachment.fileAssetId },
    });
    const otherCommRefs = await this.prisma.communicationAttachment.count({
      where: { fileAssetId: attachment.fileAssetId },
    });

    if (otherTaskRefs === 0 && otherCommRefs === 0) {
      await this.prisma.fileAsset.delete({ where: { id: attachment.fileAssetId } });
      await this.storageProvider.delete(attachment.fileAsset.storageKey);
    }

    await this.auditService.log({
      userId,
      institutionId,
      action: 'TASK_ATTACHMENT_DELETED',
      entityType: 'TaskAttachment',
      entityId: attachmentId,
      oldValues: {
        taskId,
        fileAssetId: attachment.fileAssetId,
        originalName: attachment.fileAsset.originalName,
      },
      ipAddress,
    });

    return { success: true };
  }

  async createCommunicationAttachment(
    institutionId: string,
    communicationId: string,
    fileAssetId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const communication = await this.prisma.communication.findFirst({
      where: { id: communicationId, institutionId },
    });
    if (!communication) {
      throw new NotFoundException('Communication not found');
    }

    const fileAsset = await this.findOne(institutionId, fileAssetId);

    const attachmentCount = await this.prisma.communicationAttachment.count({
      where: { communicationId, institutionId },
    });
    if (attachmentCount >= this.getMaxCommunicationAttachments()) {
      throw new BadRequestException(
        `Communication cannot have more than ${this.getMaxCommunicationAttachments()} attachments`,
      );
    }

    const existing = await this.prisma.communicationAttachment.findUnique({
      where: { communicationId_fileAssetId: { communicationId, fileAssetId } },
    });
    if (existing) {
      throw new BadRequestException('File is already attached to this communication');
    }

    const attachment = await this.prisma.communicationAttachment.create({
      data: { institutionId, communicationId, fileAssetId },
      include: { fileAsset: true },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'COMMUNICATION_ATTACHMENT_CREATED',
      entityType: 'CommunicationAttachment',
      entityId: attachment.id,
      newValues: { communicationId, fileAssetId, originalName: fileAsset.originalName },
      ipAddress,
    });

    return attachment;
  }

  async listCommunicationAttachments(institutionId: string, communicationId: string) {
    const communication = await this.prisma.communication.findFirst({
      where: { id: communicationId, institutionId },
    });
    if (!communication) {
      throw new NotFoundException('Communication not found');
    }

    return this.prisma.communicationAttachment.findMany({
      where: { communicationId, institutionId },
      include: { fileAsset: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteCommunicationAttachment(
    institutionId: string,
    communicationId: string,
    attachmentId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const attachment = await this.prisma.communicationAttachment.findFirst({
      where: { id: attachmentId, communicationId, institutionId },
      include: { fileAsset: true },
    });
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    await this.prisma.communicationAttachment.delete({ where: { id: attachmentId } });

    const otherTaskRefs = await this.prisma.taskAttachment.count({
      where: { fileAssetId: attachment.fileAssetId },
    });
    const otherCommRefs = await this.prisma.communicationAttachment.count({
      where: { fileAssetId: attachment.fileAssetId },
    });

    if (otherTaskRefs === 0 && otherCommRefs === 0) {
      await this.prisma.fileAsset.delete({ where: { id: attachment.fileAssetId } });
      await this.storageProvider.delete(attachment.fileAsset.storageKey);
    }

    await this.auditService.log({
      userId,
      institutionId,
      action: 'COMMUNICATION_ATTACHMENT_DELETED',
      entityType: 'CommunicationAttachment',
      entityId: attachmentId,
      oldValues: {
        communicationId,
        fileAssetId: attachment.fileAssetId,
        originalName: attachment.fileAsset.originalName,
      },
      ipAddress,
    });

    return { success: true };
  }
}
