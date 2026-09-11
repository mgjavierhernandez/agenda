import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import {
  resolveAccessibleStudentIds,
  getUserRoleNames,
  hasFullAccess,
} from '../../common/auth/academic-scope';
import {
  CreateSubmissionDto,
  UpdateSubmissionDto,
  GradeSubmissionDto,
  ListSubmissionsQueryDto,
} from './dto/task-submission.dto';
import { TaskSubmission, TaskSubmissionStatus, FileAssetStatus, Prisma } from '@prisma/client';

@Injectable()
export class TaskSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Verifica que el actor puede operar sobre la asignación: es el estudiante
   * titular, docente del curso, o rol administrativo. Devuelve la asignación.
   */
  private async assertAssignmentAccess(
    institutionId: string,
    taskAssignmentId: string,
    userId: string,
  ) {
    const assignment = await this.prisma.taskAssignment.findFirst({
      where: { id: taskAssignmentId, institutionId },
      include: { task: true },
    });
    if (!assignment) throw new NotFoundException('Task assignment not found');

    const roleNames = await getUserRoleNames(this.prisma, institutionId, userId);
    if (hasFullAccess(roleNames)) return assignment;

    const student = await this.prisma.student.findFirst({
      where: { id: assignment.studentId, institutionId },
      select: { id: true, userId: true },
    });
    if (student?.userId === userId) return assignment;

    const teaches = await this.prisma.teacherAssignment.findFirst({
      where: {
        institutionId,
        teacherUserId: userId,
        courseId: assignment.task.courseId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (teaches) return assignment;

    throw new ForbiddenException('You cannot operate on this task assignment');
  }

  async create(
    institutionId: string,
    taskAssignmentId: string,
    dto: CreateSubmissionDto,
    currentUserId: string,
    ipAddress?: string,
  ): Promise<TaskSubmission> {
    const assignment = await this.assertAssignmentAccess(
      institutionId,
      taskAssignmentId,
      currentUserId,
    );

    const existing = await this.prisma.taskSubmission.findUnique({
      where: { taskAssignmentId },
    });
    if (existing) throw new ConflictException('Submission already exists for this assignment');

    const now = new Date();
    const isLate = assignment.task.dueDate < now;

    const submission = await this.prisma.taskSubmission.create({
      data: {
        institutionId,
        taskAssignmentId,
        studentId: assignment.studentId,
        status: isLate ? TaskSubmissionStatus.LATE : TaskSubmissionStatus.SUBMITTED,
        content: dto.content,
        submittedAt: now,
      },
    });

    if (dto.fileAssetIds && dto.fileAssetIds.length > 0) {
      await this.attachFiles(
        institutionId,
        submission.id,
        dto.fileAssetIds,
        currentUserId,
        ipAddress,
      );
    }

    await this.auditService.log({
      userId: currentUserId,
      institutionId,
      action: 'TASK_SUBMITTED',
      entityType: 'TaskSubmission',
      entityId: submission.id,
      newValues: { taskAssignmentId, status: submission.status },
      ipAddress,
    });

    return submission;
  }

  async findByAssignment(
    institutionId: string,
    taskAssignmentId: string,
    userId?: string,
  ): Promise<TaskSubmission> {
    if (userId) {
      await this.assertAssignmentAccess(institutionId, taskAssignmentId, userId);
    }
    const submission = await this.prisma.taskSubmission.findFirst({
      where: { taskAssignmentId, institutionId },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async findAll(
    institutionId: string,
    query: ListSubmissionsQueryDto,
    userId?: string,
  ): Promise<{
    data: TaskSubmission[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskSubmissionWhereInput = {
      institutionId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
    };

    if (userId) {
      const accessible = await resolveAccessibleStudentIds(this.prisma, institutionId, userId);
      if (accessible !== null) {
        if (query.studentId && !accessible.includes(query.studentId)) {
          throw new NotFoundException('Submission not found');
        }
        where.studentId = query.studentId ?? { in: accessible };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.taskSubmission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.taskSubmission.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async update(
    institutionId: string,
    id: string,
    dto: UpdateSubmissionDto,
    currentUserId: string,
    ipAddress?: string,
  ): Promise<TaskSubmission> {
    const existing = await this.prisma.taskSubmission.findFirst({
      where: { id, institutionId },
    });
    if (!existing) throw new NotFoundException('Submission not found');

    await this.assertAssignmentAccess(institutionId, existing.taskAssignmentId, currentUserId);

    if (existing.status === TaskSubmissionStatus.GRADED) {
      throw new BadRequestException('Cannot modify a graded submission');
    }

    const submission = await this.prisma.taskSubmission.update({
      where: { id: existing.id },
      data: {
        content: dto.content,
        status: TaskSubmissionStatus.SUBMITTED,
      },
    });

    if (dto.fileAssetIds && dto.fileAssetIds.length > 0) {
      await this.attachFiles(
        institutionId,
        submission.id,
        dto.fileAssetIds,
        currentUserId,
        ipAddress,
      );
    }

    await this.auditService.log({
      userId: currentUserId,
      institutionId,
      action: 'TASK_SUBMISSION_UPDATED',
      entityType: 'TaskSubmission',
      entityId: submission.id,
      oldValues: { content: existing.content },
      newValues: { content: submission.content },
      ipAddress,
    });

    return submission;
  }

  /**
   * Adjunta archivos ya subidos (MIME/tamaño validados en /files) a la entrega.
   * Valida tenant, duplicados y tope; el ownership se verificó antes.
   */
  private async attachFiles(
    institutionId: string,
    submissionId: string,
    fileAssetIds: string[],
    userId: string,
    ipAddress?: string,
  ): Promise<void> {
    const uniqueIds = [...new Set(fileAssetIds)];
    const current = await this.prisma.submissionAttachment.count({
      where: { institutionId, submissionId },
    });
    if (current + uniqueIds.length > 10) {
      throw new BadRequestException('A submission cannot have more than 10 attachments');
    }
    for (const fileAssetId of uniqueIds) {
      const fileAsset = await this.prisma.fileAsset.findFirst({
        where: { id: fileAssetId, institutionId, status: FileAssetStatus.ACTIVE },
      });
      if (!fileAsset) {
        throw new NotFoundException(`File ${fileAssetId} not found in this institution`);
      }
      const existing = await this.prisma.submissionAttachment.findUnique({
        where: { submissionId_fileAssetId: { submissionId, fileAssetId } },
      });
      if (existing) continue;
      const attachment = await this.prisma.submissionAttachment.create({
        data: { institutionId, submissionId, fileAssetId },
      });
      await this.auditService.log({
        userId,
        institutionId,
        action: 'SUBMISSION_ATTACHMENT_CREATED',
        entityType: 'SubmissionAttachment',
        entityId: attachment.id,
        newValues: { submissionId, fileAssetId, originalName: fileAsset.originalName },
        ipAddress,
      });
    }
  }

  async listAttachments(institutionId: string, taskAssignmentId: string, userId: string) {
    const assignment = await this.assertAssignmentAccess(institutionId, taskAssignmentId, userId);
    const submission = await this.prisma.taskSubmission.findFirst({
      where: { taskAssignmentId: assignment.id, institutionId },
      include: { attachments: { include: { fileAsset: true }, orderBy: { createdAt: 'asc' } } },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission.attachments;
  }

  async removeAttachment(
    institutionId: string,
    taskAssignmentId: string,
    attachmentId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const assignment = await this.assertAssignmentAccess(institutionId, taskAssignmentId, userId);
    const submission = await this.prisma.taskSubmission.findFirst({
      where: { taskAssignmentId: assignment.id, institutionId },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.status === TaskSubmissionStatus.GRADED) {
      throw new BadRequestException('Cannot modify attachments of a graded submission');
    }
    const attachment = await this.prisma.submissionAttachment.findFirst({
      where: { id: attachmentId, submissionId: submission.id, institutionId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    await this.prisma.submissionAttachment.delete({ where: { id: attachment.id } });
    await this.auditService.log({
      userId,
      institutionId,
      action: 'SUBMISSION_ATTACHMENT_DELETED',
      entityType: 'SubmissionAttachment',
      entityId: attachment.id,
      oldValues: { submissionId: submission.id, fileAssetId: attachment.fileAssetId },
      ipAddress,
    });
    return { deleted: true };
  }

  async grade(
    institutionId: string,
    id: string,
    dto: GradeSubmissionDto,
    currentUserId: string,
    ipAddress?: string,
  ): Promise<TaskSubmission> {
    const existing = await this.prisma.taskSubmission.findFirst({
      where: { id, institutionId },
      include: { taskAssignment: { include: { task: true } } },
    });
    if (!existing) throw new NotFoundException('Submission not found');

    // Calificar es acto docente: solo docente del curso o rol administrativo.
    const roleNames = await getUserRoleNames(this.prisma, institutionId, currentUserId);
    if (!hasFullAccess(roleNames)) {
      const teaches = await this.prisma.teacherAssignment.findFirst({
        where: {
          institutionId,
          teacherUserId: currentUserId,
          courseId: existing.taskAssignment.task.courseId,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (!teaches) {
        throw new ForbiddenException('Only the course teacher can grade this submission');
      }
    }

    if (existing.status === TaskSubmissionStatus.GRADED) {
      throw new BadRequestException('Submission already graded');
    }

    const submission = await this.prisma.taskSubmission.update({
      where: { id: existing.id },
      data: {
        grade: dto.grade,
        feedback: dto.feedback,
        status: TaskSubmissionStatus.GRADED,
        gradedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId: currentUserId,
      institutionId,
      action: 'TASK_GRADED',
      entityType: 'TaskSubmission',
      entityId: submission.id,
      oldValues: { grade: existing.grade?.toString() },
      newValues: { grade: dto.grade, feedback: dto.feedback },
      ipAddress,
    });

    return submission;
  }
}
