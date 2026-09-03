import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import {
  StudentFollowUpAuthorizationService,
} from '../../common/auth/student-follow-up-authorization';
import { SignaturesService } from '../signatures/signatures.service';
import { RequestFollowUpSignatureDto } from './dto/request-follow-up-signature.dto';
import { SignatureRequest, SignatureRecipient } from '@prisma/client';
import { sendFollowUpNotification } from './follow-up-notification.helper';

@Injectable()
export class StudentFollowUpSignatureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authorizationService: StudentFollowUpAuthorizationService,
    private readonly signaturesService: SignaturesService,
  ) {}

  private async getAndAuthorizeFollowUpForWrite(
    institutionId: string,
    followUpId: string,
    userId: string,
  ) {
    const followUp = await this.prisma.studentFollowUp.findFirst({
      where: { id: followUpId, institutionId },
    });

    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }

    const access = await this.authorizationService.canUpdate(
      userId,
      institutionId,
      followUpId,
    );
    if (!access.allowed) {
      throw new ForbiddenException('Access denied');
    }

    return followUp;
  }

  async requestSignature(
    institutionId: string,
    followUpId: string,
    dto: RequestFollowUpSignatureDto,
    userId: string,
    ipAddress?: string,
  ): Promise<SignatureRequest & { recipients: SignatureRecipient[] }> {
    const followUp = await this.getAndAuthorizeFollowUpForWrite(
      institutionId,
      followUpId,
      userId,
    );

    if (dto.followUpEntryId) {
      const entry = await this.prisma.followUpEntry.findFirst({
        where: {
          id: dto.followUpEntryId,
          followUpId,
          followUp: { institutionId },
        },
      });
      if (!entry) {
        throw new BadRequestException('Follow-up entry not found');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      for (const uid of dto.recipientUserIds) {
        const membership = await tx.userInstitution.findFirst({
          where: { userId: uid, institutionId, status: 'ACTIVE' },
        });
        if (!membership) {
          throw new BadRequestException(
            `User ${uid} is not a member of this institution`,
          );
        }
      }

      const uniqueIds = new Set(dto.recipientUserIds);
      if (uniqueIds.size !== dto.recipientUserIds.length) {
        throw new BadRequestException('Duplicate recipient user IDs are not allowed');
      }

      const request = await tx.signatureRequest.create({
        data: {
          institutionId,
          title: dto.title,
          description: dto.description,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          followUpId,
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
      action: 'SIGNATURE_REQUESTED_FROM_FOLLOW_UP',
      entityType: 'SignatureRequest',
      entityId: result.request.id,
      newValues: {
        followUpId,
        followUpEntryId: dto.followUpEntryId || null,
        title: result.request.title,
        recipientCount: result.recipients.length,
      },
      ipAddress,
    });

    void sendFollowUpNotification(
      this.prisma,
      {
        institutionId,
        followUpId,
        studentId: followUp.studentId,
        confidentiality: followUp.confidentiality,
        actorUserId: userId,
      },
      'SIGNATURE_REQUEST_CREATED',
    ).catch(() => {});

    return { ...result.request, recipients: result.recipients };
  }

  async findByFollowUp(
    institutionId: string,
    followUpId: string,
    userId: string,
  ): Promise<(SignatureRequest & { recipients: SignatureRecipient[] })[]> {
    const access = await this.authorizationService.canRead(
      userId,
      institutionId,
      followUpId,
    );
    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      if (access.reason === 'CONFIDENTIALITY_RESTRICTED') {
        throw new NotFoundException('Follow-up not found');
      }
      throw new ForbiddenException('Access denied');
    }

    const requests = await this.prisma.signatureRequest.findMany({
      where: { institutionId, followUpId },
      orderBy: { createdAt: 'desc' },
      include: {
        recipients: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        followUp: { select: { id: true, title: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return requests;
  }
}
