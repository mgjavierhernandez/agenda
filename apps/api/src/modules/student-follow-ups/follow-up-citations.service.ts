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
import { CreateFollowUpCitationDto } from './dto/create-follow-up-citation.dto';
import { UpdateFollowUpCitationDto } from './dto/update-follow-up-citation.dto';
import { ListFollowUpCitationsQueryDto } from './dto/list-follow-up-citations-query.dto';
import { FollowUpCitation, Prisma } from '@prisma/client';
import { sendFollowUpNotification } from './follow-up-notification.helper';

@Injectable()
export class FollowUpCitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authorizationService: StudentFollowUpAuthorizationService,
  ) {}

  private async getAndAuthorizeFollowUp(
    institutionId: string,
    followUpId: string,
    userId: string,
  ) {
    const followUp = await this.prisma.studentFollowUp.findFirst({
      where: { id: followUpId, institutionId },
      include: { student: true },
    });

    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }

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

    return followUp;
  }

  private assertFollowUpMutable(followUp: { status: string }) {
    if (followUp.status === 'CLOSED') {
      throw new BadRequestException(
        'Cannot modify citations on a closed follow-up',
      );
    }
  }

  async create(
    institutionId: string,
    followUpId: string,
    dto: CreateFollowUpCitationDto,
    userId: string,
    ipAddress?: string,
  ): Promise<FollowUpCitation> {
    const followUp = await this.getAndAuthorizeFollowUp(
      institutionId,
      followUpId,
      userId,
    );

    const access = await this.authorizationService.canUpdate(
      userId,
      institutionId,
      followUpId,
    );
    if (!access.allowed) {
      throw new ForbiddenException('Access denied');
    }

    this.assertFollowUpMutable(followUp);

    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Citation scheduled time must be in the future',
      );
    }

    const citation = await this.prisma.followUpCitation.create({
      data: {
        institutionId,
        followUpId,
        createdById: userId,
        scheduledAt,
        reason: dto.reason.trim(),
        objective: dto.objective?.trim() || null,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'CITATION_CREATED',
      entityType: 'FollowUpCitation',
      entityId: citation.id,
      newValues: {
        followUpId,
        scheduledAt: dto.scheduledAt,
        reason: dto.reason,
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
      'CITATION_CREATED',
    ).catch(() => {});

    return citation;
  }

  async findAll(
    institutionId: string,
    followUpId: string,
    query: ListFollowUpCitationsQueryDto,
    userId: string,
  ): Promise<{ data: FollowUpCitation[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    await this.getAndAuthorizeFollowUp(institutionId, followUpId, userId);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FollowUpCitationWhereInput = {
      institutionId,
      followUpId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.followUpCitation.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.followUpCitation.count({ where }),
    ]);

    return {
      data,
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
    followUpId: string,
    citationId: string,
    userId: string,
  ): Promise<FollowUpCitation> {
    await this.getAndAuthorizeFollowUp(institutionId, followUpId, userId);

    const citation = await this.prisma.followUpCitation.findFirst({
      where: { id: citationId, institutionId, followUpId },
    });

    if (!citation) {
      throw new NotFoundException('Citation not found');
    }

    return citation;
  }

  async update(
    institutionId: string,
    followUpId: string,
    citationId: string,
    dto: UpdateFollowUpCitationDto,
    userId: string,
    ipAddress?: string,
  ): Promise<FollowUpCitation> {
    const followUp = await this.getAndAuthorizeFollowUp(
      institutionId,
      followUpId,
      userId,
    );

    const access = await this.authorizationService.canUpdate(
      userId,
      institutionId,
      followUpId,
    );
    if (!access.allowed) {
      throw new ForbiddenException('Access denied');
    }

    this.assertFollowUpMutable(followUp);

    const existing = await this.prisma.followUpCitation.findFirst({
      where: { id: citationId, institutionId, followUpId },
    });

    if (!existing) {
      throw new NotFoundException('Citation not found');
    }

    const updateData: Prisma.FollowUpCitationUpdateInput = {};

    if (dto.scheduledAt !== undefined) {
      updateData.scheduledAt = new Date(dto.scheduledAt);
    }
    if (dto.reason !== undefined) {
      updateData.reason = dto.reason.trim();
    }
    if (dto.objective !== undefined) {
      updateData.objective = dto.objective?.trim() || null;
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }
    if (dto.result !== undefined) {
      updateData.result = dto.result?.trim() || null;
    }
    if (dto.attendedAt !== undefined) {
      updateData.attendedAt = dto.attendedAt ? new Date(dto.attendedAt) : null;
    }

    const updated = await this.prisma.followUpCitation.update({
      where: { id: citationId },
      data: updateData,
    });

    const statusChanged = dto.status && dto.status !== existing.status;
    const auditAction = statusChanged
      ? `CITATION_${dto.status}`
      : 'CITATION_UPDATED';

    await this.auditService.log({
      userId,
      institutionId,
      action: auditAction,
      entityType: 'FollowUpCitation',
      entityId: citationId,
      oldValues: {
        status: existing.status,
        scheduledAt: existing.scheduledAt.toISOString(),
        reason: existing.reason,
      },
      newValues: {
        status: updated.status,
        scheduledAt: updated.scheduledAt.toISOString(),
        reason: updated.reason,
      },
      ipAddress,
    });

    if (statusChanged) {
      void sendFollowUpNotification(
        this.prisma,
        {
          institutionId,
          followUpId,
          studentId: followUp.studentId,
          confidentiality: followUp.confidentiality,
          actorUserId: userId,
        },
        `CITATION_${dto.status}`,
      ).catch(() => {});
    }

    return updated;
  }

  async remove(
    institutionId: string,
    followUpId: string,
    citationId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<void> {
    const followUp = await this.getAndAuthorizeFollowUp(
      institutionId,
      followUpId,
      userId,
    );

    const access = await this.authorizationService.canUpdate(
      userId,
      institutionId,
      followUpId,
    );
    if (!access.allowed) {
      throw new ForbiddenException('Access denied');
    }

    this.assertFollowUpMutable(followUp);

    const existing = await this.prisma.followUpCitation.findFirst({
      where: { id: citationId, institutionId, followUpId },
    });

    if (!existing) {
      throw new NotFoundException('Citation not found');
    }

    await this.prisma.followUpCitation.delete({
      where: { id: citationId },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'CITATION_DELETED',
      entityType: 'FollowUpCitation',
      entityId: citationId,
      oldValues: {
        followUpId,
        reason: existing.reason,
        scheduledAt: existing.scheduledAt.toISOString(),
        status: existing.status,
      },
      ipAddress,
    });
  }
}
