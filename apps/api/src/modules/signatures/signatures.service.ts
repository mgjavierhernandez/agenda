import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EMAIL_PROVIDER, EmailProvider, EmailTemplates } from '../auth/services/email';
import { CreateSignatureRequestDto } from './dto/create-signature-request.dto';
import { UpdateSignatureRequestDto } from './dto/update-signature-request.dto';
import { ListSignatureRequestsQueryDto } from './dto/list-signature-requests-query.dto';
import {
  SignatureRequest,
  SignatureRecipient,
  SignatureRequestStatus,
  SignatureRecipientStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { sendFollowUpSignatureNotification } from '../student-follow-ups/follow-up-notification.helper';

@Injectable()
export class SignaturesService {
  private readonly logger = new Logger(SignaturesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
    private readonly emailTemplates: EmailTemplates,
  ) {}

  private async validateRecipients(
    institutionId: string,
    recipientUserIds: string[],
  ): Promise<void> {
    for (const userId of recipientUserIds) {
      const membership = await this.prisma.userInstitution.findFirst({
        where: {
          userId,
          institutionId,
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new BadRequestException(
          `User ${userId} is not a member of this institution`,
        );
      }
    }

    const uniqueIds = new Set(recipientUserIds);
    if (uniqueIds.size !== recipientUserIds.length) {
      throw new BadRequestException('Duplicate recipient user IDs are not allowed');
    }
  }

  private async checkExpiration(
    institutionId: string,
    request: SignatureRequest,
  ): Promise<SignatureRequest & { recipients: SignatureRecipient[] }> {
    if (
      request.status === SignatureRequestStatus.PUBLISHED &&
      request.dueDate &&
      new Date() > request.dueDate
    ) {
      const updated = await this.prisma.signatureRequest.update({
        where: { id: request.id },
        data: { status: SignatureRequestStatus.EXPIRED },
        include: { recipients: true },
      });
      return updated;
    }
    const full = await this.prisma.signatureRequest.findFirst({
      where: { id: request.id, institutionId },
      include: { recipients: true },
    });
    return full!;
  }

  private async checkCompletion(
    signatureRequestId: string,
    institutionId: string,
  ): Promise<void> {
    const pendingCount = await this.prisma.signatureRecipient.count({
      where: {
        signatureRequestId,
        status: SignatureRecipientStatus.PENDING,
      },
    });

    if (pendingCount === 0) {
      const request = await this.prisma.signatureRequest.findFirst({
        where: { id: signatureRequestId, institutionId },
      });
      if (request && request.status === SignatureRequestStatus.PUBLISHED) {
        await this.prisma.signatureRequest.update({
          where: { id: signatureRequestId },
          data: { status: SignatureRequestStatus.COMPLETED },
        });

        await this.auditService.log({
          institutionId,
          action: 'SIGNATURE_REQUEST_COMPLETED',
          entityType: 'SignatureRequest',
          entityId: signatureRequestId,
          oldValues: { status: SignatureRequestStatus.PUBLISHED },
          newValues: { status: SignatureRequestStatus.COMPLETED },
        });
      }
    }
  }

  async create(
    institutionId: string,
    dto: CreateSignatureRequestDto,
    userId: string,
    ipAddress?: string,
  ): Promise<SignatureRequest & { recipients: SignatureRecipient[] }> {
    await this.validateRecipients(institutionId, dto.recipientUserIds);

    if (dto.followUpId) {
      const followUp = await this.prisma.studentFollowUp.findFirst({
        where: { id: dto.followUpId, institutionId },
      });
      if (!followUp) {
        throw new BadRequestException('Follow-up not found');
      }
    }

    if (dto.followUpEntryId) {
      const entry = await this.prisma.followUpEntry.findFirst({
        where: {
          id: dto.followUpEntryId,
          followUp: { id: dto.followUpId || undefined, institutionId },
        },
      });
      if (!entry) {
        throw new BadRequestException('Follow-up entry not found');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const request = await tx.signatureRequest.create({
        data: {
          institutionId,
          title: dto.title,
          description: dto.description,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          followUpId: dto.followUpId || null,
          followUpEntryId: dto.followUpEntryId || null,
          createdById: userId,
        },
      });

      const recipients = await Promise.all(
        dto.recipientUserIds.map((uid) =>
          tx.signatureRecipient.create({
            data: {
              signatureRequestId: request.id,
              userId: uid,
            },
          }),
        ),
      );

      return { request, recipients };
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'SIGNATURE_REQUEST_CREATED',
      entityType: 'SignatureRequest',
      entityId: result.request.id,
      newValues: {
        title: result.request.title,
        recipientCount: result.recipients.length,
      },
      ipAddress,
    });

    return { ...result.request, recipients: result.recipients };
  }

  async findAll(
    institutionId: string,
    query: ListSignatureRequestsQueryDto,
    userId: string,
    isManager: boolean,
  ): Promise<{
    data: (SignatureRequest & { recipients: SignatureRecipient[] })[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    let where: Prisma.SignatureRequestWhereInput;

    if (isManager) {
      where = {
        institutionId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.dueDateFrom || query.dueDateTo
          ? {
              dueDate: {
                ...(query.dueDateFrom ? { gte: new Date(query.dueDateFrom) } : {}),
                ...(query.dueDateTo ? { lte: new Date(query.dueDateTo) } : {}),
              },
            }
          : {}),
        ...(query.followUpId ? { followUpId: query.followUpId } : {}),
      };
    } else {
      where = {
        institutionId,
        recipients: { some: { userId } },
        status: { notIn: [SignatureRequestStatus.DRAFT, SignatureRequestStatus.INACTIVE] },
        ...(query.status
          ? { status: query.status }
          : {}),
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.dueDateFrom || query.dueDateTo
          ? {
              dueDate: {
                ...(query.dueDateFrom ? { gte: new Date(query.dueDateFrom) } : {}),
                ...(query.dueDateTo ? { lte: new Date(query.dueDateTo) } : {}),
              },
            }
          : {}),
        ...(query.followUpId ? { followUpId: query.followUpId } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.signatureRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          recipients: true,
          followUp: { select: { id: true, title: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.signatureRequest.count({ where }),
    ]);

    const checkedData = await Promise.all(
      data.map((r) => this.checkExpiration(institutionId, r)),
    );

    return {
      data: checkedData,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    institutionId: string,
    requestId: string,
    userId: string,
    isManager: boolean,
  ): Promise<SignatureRequest & { recipients: SignatureRecipient[] }> {
    const request = await this.prisma.signatureRequest.findFirst({
      where: { id: requestId, institutionId },
      include: {
        recipients: true,
        followUp: { select: { id: true, title: true, studentId: true, confidentiality: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Signature request not found');
    }

    if (!isManager) {
      const isRecipient = request.recipients.some((r) => r.userId === userId);
      if (!isRecipient) {
        throw new NotFoundException('Signature request not found');
      }

      if (
        request.status === SignatureRequestStatus.DRAFT ||
        request.status === SignatureRequestStatus.INACTIVE
      ) {
        throw new NotFoundException('Signature request not found');
      }
    }

    const checked = await this.checkExpiration(institutionId, request);
    return checked;
  }

  async findByFollowUp(
    institutionId: string,
    followUpId: string,
  ): Promise<(SignatureRequest & { recipients: SignatureRecipient[] })[]> {
    const requests = await this.prisma.signatureRequest.findMany({
      where: { institutionId, followUpId },
      orderBy: { createdAt: 'desc' },
      include: {
        recipients: true,
        followUp: { select: { id: true, title: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const checked: (SignatureRequest & { recipients: SignatureRecipient[] })[] = [];
    for (const request of requests) {
      checked.push(await this.checkExpiration(institutionId, request));
    }
    return checked;
  }

  async update(
    institutionId: string,
    requestId: string,
    dto: UpdateSignatureRequestDto,
    userId: string,
    ipAddress?: string,
  ): Promise<SignatureRequest & { recipients: SignatureRecipient[] }> {
    const existing = await this.prisma.signatureRequest.findFirst({
      where: { id: requestId, institutionId },
      include: { recipients: true },
    });

    if (!existing) {
      throw new NotFoundException('Signature request not found');
    }

    if (existing.status !== SignatureRequestStatus.DRAFT) {
      throw new BadRequestException('Can only update requests in DRAFT status');
    }

    const updateData: Prisma.SignatureRequestUpdateInput = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.dueDate !== undefined) {
      updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const request = await tx.signatureRequest.update({
        where: { id: requestId },
        data: updateData,
      });

      let recipients = existing.recipients;

      if (dto.recipientUserIds !== undefined) {
        await this.validateRecipients(institutionId, dto.recipientUserIds);

        await tx.signatureRecipient.deleteMany({
          where: { signatureRequestId: requestId },
        });

        recipients = await Promise.all(
          dto.recipientUserIds.map((uid) =>
            tx.signatureRecipient.create({
              data: {
                signatureRequestId: requestId,
                userId: uid,
              },
            }),
          ),
        );
      }

      return { request, recipients };
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'SIGNATURE_REQUEST_UPDATED',
      entityType: 'SignatureRequest',
      entityId: requestId,
      oldValues: {
        title: existing.title,
        description: existing.description,
        recipientCount: existing.recipients.length,
      },
      newValues: {
        title: result.request.title,
        description: result.request.description,
        recipientCount: result.recipients.length,
      },
      ipAddress,
    });

    return { ...result.request, recipients: result.recipients };
  }

  async publish(
    institutionId: string,
    requestId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<SignatureRequest & { recipients: SignatureRecipient[] }> {
    const existing = await this.prisma.signatureRequest.findFirst({
      where: { id: requestId, institutionId },
      include: { recipients: true },
    });

    if (!existing) {
      throw new NotFoundException('Signature request not found');
    }

    if (existing.status !== SignatureRequestStatus.DRAFT) {
      throw new BadRequestException('Can only publish requests in DRAFT status');
    }

    if (existing.recipients.length === 0) {
      throw new BadRequestException('Cannot publish a request with no recipients');
    }

    if (existing.dueDate && existing.dueDate <= new Date()) {
      throw new BadRequestException('dueDate must be in the future');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const request = await tx.signatureRequest.update({
        where: { id: requestId },
        data: { status: SignatureRequestStatus.PUBLISHED },
        include: { recipients: true },
      });

      return { request };
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'SIGNATURE_REQUEST_PUBLISHED',
      entityType: 'SignatureRequest',
      entityId: requestId,
      oldValues: { status: existing.status },
      newValues: { status: result.request.status },
      ipAddress,
    });

    // Best-effort, asynchronous notifications + emails to each signer. Never
    // blocks nor rolls back the publish if these fail; errors are sanitized.
    void this.notifySigners(institutionId, result.request);

    return result.request;
  }

  async sign(
    institutionId: string,
    requestId: string,
    currentUserId: string,
    ipAddress?: string,
  ): Promise<SignatureRequest & { recipients: SignatureRecipient[] }> {
    const request = await this.prisma.signatureRequest.findFirst({
      where: { id: requestId, institutionId },
      include: { recipients: true },
    });

    if (!request) {
      throw new NotFoundException('Signature request not found');
    }

    const checkedRequest = await this.checkExpiration(institutionId, request);
    if (checkedRequest.status === SignatureRequestStatus.EXPIRED) {
      throw new BadRequestException('Cannot sign an expired request');
    }

    if (checkedRequest.status !== SignatureRequestStatus.PUBLISHED) {
      throw new BadRequestException('Can only sign published requests');
    }

    const recipient = request.recipients.find((r) => r.userId === currentUserId);
    if (!recipient) {
      throw new ForbiddenException('You are not a recipient of this request');
    }

    if (recipient.status === SignatureRecipientStatus.SIGNED) {
      return { ...checkedRequest, recipients: request.recipients };
    }

    if (recipient.status !== SignatureRecipientStatus.PENDING) {
      throw new BadRequestException('Recipient is not in PENDING status');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.signatureRecipient.update({
        where: { id: recipient.id },
        data: {
          status: SignatureRecipientStatus.SIGNED,
          signedAt: new Date(),
        },
      });

      const pendingCount = await tx.signatureRecipient.count({
        where: {
          signatureRequestId: requestId,
          status: SignatureRecipientStatus.PENDING,
        },
      });

      let updatedRequest = checkedRequest;
      if (pendingCount === 0) {
        updatedRequest = await tx.signatureRequest.update({
          where: { id: requestId },
          data: { status: SignatureRequestStatus.COMPLETED },
          include: { recipients: true },
        });

        await this.auditService.log({
          institutionId,
          action: 'SIGNATURE_REQUEST_COMPLETED',
          entityType: 'SignatureRequest',
          entityId: requestId,
          oldValues: { status: SignatureRequestStatus.PUBLISHED },
          newValues: { status: SignatureRequestStatus.COMPLETED },
        });
      }

      const allRecipients = await tx.signatureRecipient.findMany({
        where: { signatureRequestId: requestId },
      });

      return { request: updatedRequest, recipients: allRecipients };
    });

    await this.auditService.log({
      userId: currentUserId,
      institutionId,
      action: 'SIGNATURE_SIGNED',
      entityType: 'SignatureRecipient',
      entityId: recipient.id,
      oldValues: { status: SignatureRecipientStatus.PENDING },
      newValues: {
        status: SignatureRecipientStatus.SIGNED,
        signedAt: String(new Date()),
      },
      ipAddress,
    });

    if (result.request.followUpId) {
      const followUp = await this.prisma.studentFollowUp.findFirst({
        where: { id: result.request.followUpId, institutionId },
        select: { id: true, studentId: true, confidentiality: true },
      });
      if (followUp) {
        void sendFollowUpSignatureNotification(
          this.prisma,
          {
            institutionId,
            followUpId: followUp.id,
            studentId: followUp.studentId,
            confidentiality: followUp.confidentiality,
            actorUserId: currentUserId,
          },
          'SIGNATURE_COMPLETED_FROM_FOLLOW_UP',
        ).catch(() => {});
      }
    }

    return { ...result.request, recipients: result.recipients };
  }

  async decline(
    institutionId: string,
    requestId: string,
    currentUserId: string,
    ipAddress?: string,
  ): Promise<SignatureRequest & { recipients: SignatureRecipient[] }> {
    const request = await this.prisma.signatureRequest.findFirst({
      where: { id: requestId, institutionId },
      include: { recipients: true },
    });

    if (!request) {
      throw new NotFoundException('Signature request not found');
    }

    const checkedRequest = await this.checkExpiration(institutionId, request);
    if (checkedRequest.status === SignatureRequestStatus.EXPIRED) {
      throw new BadRequestException('Cannot decline an expired request');
    }

    if (checkedRequest.status !== SignatureRequestStatus.PUBLISHED) {
      throw new BadRequestException('Can only decline published requests');
    }

    const recipient = request.recipients.find((r) => r.userId === currentUserId);
    if (!recipient) {
      throw new ForbiddenException('You are not a recipient of this request');
    }

    if (recipient.status !== SignatureRecipientStatus.PENDING) {
      throw new BadRequestException('Recipient is not in PENDING status');
    }

    await this.prisma.signatureRecipient.update({
      where: { id: recipient.id },
      data: { status: SignatureRecipientStatus.DECLINED },
    });

    await this.auditService.log({
      userId: currentUserId,
      institutionId,
      action: 'SIGNATURE_DECLINED',
      entityType: 'SignatureRecipient',
      entityId: recipient.id,
      oldValues: { status: SignatureRecipientStatus.PENDING },
      newValues: { status: SignatureRecipientStatus.DECLINED },
      ipAddress,
    });

    if (request.followUpId) {
      const followUp = await this.prisma.studentFollowUp.findFirst({
        where: { id: request.followUpId, institutionId },
        select: { id: true, studentId: true, confidentiality: true },
      });
      if (followUp) {
        void sendFollowUpSignatureNotification(
          this.prisma,
          {
            institutionId,
            followUpId: followUp.id,
            studentId: followUp.studentId,
            confidentiality: followUp.confidentiality,
            actorUserId: currentUserId,
          },
          'SIGNATURE_DECLINED_FROM_FOLLOW_UP',
        ).catch(() => {});
      }
    }

    const updatedRequest = await this.prisma.signatureRequest.findFirst({
      where: { id: requestId, institutionId },
      include: { recipients: true },
    });

    return updatedRequest!;
  }

  async deactivate(
    institutionId: string,
    requestId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<SignatureRequest & { recipients: SignatureRecipient[] }> {
    const existing = await this.prisma.signatureRequest.findFirst({
      where: { id: requestId, institutionId },
      include: { recipients: true },
    });

    if (!existing) {
      throw new NotFoundException('Signature request not found');
    }

    if (existing.status === SignatureRequestStatus.INACTIVE) {
      return existing;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const request = await tx.signatureRequest.update({
        where: { id: requestId },
        data: { status: SignatureRequestStatus.INACTIVE },
      });

      const recipients = await tx.signatureRecipient.findMany({
        where: { signatureRequestId: requestId },
      });

      return { request, recipients };
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'SIGNATURE_REQUEST_DEACTIVATED',
      entityType: 'SignatureRequest',
      entityId: requestId,
      oldValues: { status: existing.status },
      newValues: { status: result.request.status },
      ipAddress,
    });

    return { ...result.request, recipients: result.recipients };
  }

  private async notifySigners(
    institutionId: string,
    request: SignatureRequest & { recipients: SignatureRecipient[] },
  ): Promise<void> {
    try {
      if (request.recipients.length === 0) return;

      const recipientIds = request.recipients
        .map((r) => r.userId)
        .filter((id: string | null): id is string => !!id);

      const [users, institution] = await Promise.all([
        this.prisma.user.findMany({
          where: { id: { in: recipientIds } },
          select: { id: true, email: true, firstName: true, lastName: true },
        }),
        this.prisma.institution.findUnique({
          where: { id: institutionId },
          select: { name: true },
        }),
      ]);

      const userById = new Map(users.map((u) => [u.id, u]));
      const institutionName = institution?.name ?? '';
      const title = `Solicitud de firma: ${request.title}`;
      const message = `Debes revisar y firmar la solicitud "${request.title}".`;

      for (const recipient of request.recipients) {
        if (!recipient.userId) continue;
        const user = userById.get(recipient.userId);
        if (!user) continue;

        // In-app notification (reuse existing notification system).
        this.notificationsService
          .create(institutionId, {
            type: NotificationType.SIGNATURE_REQUEST,
            title,
            message,
            userId: recipient.userId,
            entityType: 'SignatureRequest',
            entityId: request.id,
          }, 'system')
          .catch((err: unknown) => {
            const em = err instanceof Error ? err.message : String(err);
            this.logger.warn(`[signature ${request.id}] notification to ${recipient.userId} failed: ${em}`);
          });

        // Email (fire-and-forget).
        if (user.email) {
          this.emailProvider
            .sendSignatureRequest({
              to: user.email,
              recipientName: `${user.firstName} ${user.lastName}`.trim(),
              institutionName,
              title: request.title,
              description: request.description,
              dueDate: request.dueDate,
            })
            .catch((err: unknown) => {
              const em = err instanceof Error ? err.message : String(err);
              this.logger.warn(`[signature ${request.id}] email to ${user.email} failed: ${em}`);
            });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[signature ${request.id}] notification/email dispatch skipped: ${message}`);
    }
  }
}
