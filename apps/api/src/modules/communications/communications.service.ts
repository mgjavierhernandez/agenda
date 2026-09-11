import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { AuthorizationService } from '../auth/authorization/authorization.service';
import { EMAIL_PROVIDER, EmailProvider, EmailTemplates } from '../auth/services/email';
import { CreateCommunicationDto } from './dto/create-communication.dto';
import { UpdateCommunicationDto } from './dto/update-communication.dto';
import { ListCommunicationsQueryDto } from './dto/list-communications-query.dto';
import { Communication, CommunicationStatus, CommunicationAudience, Prisma } from '@prisma/client';

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authorizationService: AuthorizationService,
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
    private readonly emailTemplates: EmailTemplates,
  ) {}

  private async canUserViewCommunication(
    userId: string,
    institutionId: string,
    audience: CommunicationAudience,
    status: CommunicationStatus,
    expiresAt: Date | null,
  ): Promise<boolean> {
    if (status !== CommunicationStatus.PUBLISHED) {
      return false;
    }

    if (expiresAt && new Date() > expiresAt) {
      return false;
    }

    if (audience === CommunicationAudience.ALL) {
      return true;
    }

    const roles = await this.authorizationService.getUserRoles(userId, institutionId);
    const roleNames = roles.map((r) => r.name);

    switch (audience) {
      case CommunicationAudience.TEACHERS:
        return (
          roleNames.includes('TEACHER') ||
          roleNames.includes('INSTITUTION_ADMIN') ||
          roleNames.includes('SUPER_ADMIN')
        );
      case CommunicationAudience.PARENTS:
        return (
          roleNames.includes('PARENT') ||
          roleNames.includes('INSTITUTION_ADMIN') ||
          roleNames.includes('SUPER_ADMIN')
        );
      case CommunicationAudience.STUDENTS:
        return (
          roleNames.includes('STUDENT') ||
          roleNames.includes('INSTITUTION_ADMIN') ||
          roleNames.includes('SUPER_ADMIN')
        );
      default:
        return false;
    }
  }

  async create(
    institutionId: string,
    dto: CreateCommunicationDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Communication> {
    const communication = await this.prisma.communication.create({
      data: {
        institutionId,
        title: dto.title,
        content: dto.content,
        audience: dto.audience,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'COMMUNICATION_CREATED',
      entityType: 'Communication',
      entityId: communication.id,
      newValues: {
        title: communication.title,
        audience: communication.audience,
        status: communication.status,
      },
      ipAddress,
    });

    return communication;
  }

  async findAll(
    institutionId: string,
    query: ListCommunicationsQueryDto,
  ): Promise<{
    data: Communication[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CommunicationWhereInput = {
      institutionId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.audience ? { audience: query.audience } : {}),
      ...(query.publishedFrom || query.publishedTo
        ? {
            publishedAt: {
              ...(query.publishedFrom ? { gte: new Date(query.publishedFrom) } : {}),
              ...(query.publishedTo ? { lte: new Date(query.publishedTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { content: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.communication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.communication.count({ where }),
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

  async findAllVisible(
    institutionId: string,
    query: ListCommunicationsQueryDto,
    userId: string,
  ): Promise<{
    data: Communication[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CommunicationWhereInput = {
      institutionId,
      status: CommunicationStatus.PUBLISHED,
      ...(query.audience ? { audience: query.audience } : {}),
      ...(query.publishedFrom || query.publishedTo
        ? {
            publishedAt: {
              ...(query.publishedFrom ? { gte: new Date(query.publishedFrom) } : {}),
              ...(query.publishedTo ? { lte: new Date(query.publishedTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { content: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const allData = await this.prisma.communication.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
    });

    const visibleData: Communication[] = [];
    for (const comm of allData) {
      if (
        await this.canUserViewCommunication(
          userId,
          institutionId,
          comm.audience,
          comm.status,
          comm.expiresAt,
        )
      ) {
        visibleData.push(comm);
      }
    }

    const pagedData = visibleData.slice(skip, skip + limit);

    return {
      data: pagedData,
      meta: {
        page,
        limit,
        total: visibleData.length,
        totalPages: Math.ceil(visibleData.length / limit),
      },
    };
  }

  async findOne(institutionId: string, communicationId: string): Promise<Communication> {
    const communication = await this.prisma.communication.findFirst({
      where: {
        id: communicationId,
        institutionId,
      },
    });

    if (!communication) {
      throw new NotFoundException('Communication not found');
    }

    return communication;
  }

  async findOneVisible(
    institutionId: string,
    communicationId: string,
    userId: string,
  ): Promise<Communication> {
    const communication = await this.prisma.communication.findFirst({
      where: {
        id: communicationId,
        institutionId,
      },
    });

    if (!communication) {
      throw new NotFoundException('Communication not found');
    }

    const canView = await this.canUserViewCommunication(
      userId,
      institutionId,
      communication.audience,
      communication.status,
      communication.expiresAt,
    );

    if (!canView) {
      throw new NotFoundException('Communication not found');
    }

    return communication;
  }

  async update(
    institutionId: string,
    communicationId: string,
    dto: UpdateCommunicationDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Communication> {
    const existing = await this.prisma.communication.findFirst({
      where: {
        id: communicationId,
        institutionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Communication not found');
    }

    if (dto.expiresAt !== undefined && dto.expiresAt !== null) {
      const expiresAt = new Date(dto.expiresAt);
      if (expiresAt <= new Date()) {
        throw new BadRequestException('expiresAt must be in the future');
      }
    }

    const updateData: Prisma.CommunicationUpdateInput = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.audience !== undefined) updateData.audience = dto.audience;
    if (dto.expiresAt !== undefined) {
      updateData.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    const communication = await this.prisma.communication.update({
      where: { id: communicationId },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'COMMUNICATION_UPDATED',
      entityType: 'Communication',
      entityId: communication.id,
      oldValues: {
        title: existing.title,
        content: existing.content,
        audience: existing.audience,
        status: existing.status,
      },
      newValues: {
        title: communication.title,
        content: communication.content,
        audience: communication.audience,
        status: communication.status,
      },
      ipAddress,
    });

    return communication;
  }

  async publish(
    institutionId: string,
    communicationId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<Communication> {
    const existing = await this.prisma.communication.findFirst({
      where: {
        id: communicationId,
        institutionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Communication not found');
    }

    if (existing.status === CommunicationStatus.INACTIVE) {
      throw new BadRequestException('Cannot publish an inactive communication');
    }

    if (existing.status === CommunicationStatus.PUBLISHED) {
      return existing;
    }

    if (existing.expiresAt && existing.expiresAt <= new Date()) {
      throw new BadRequestException(
        'Cannot publish a communication with an expired expiration date',
      );
    }

    const communication = await this.prisma.communication.update({
      where: { id: communicationId },
      data: {
        status: CommunicationStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    // Auto-create recipients based on audience
    await this.createRecipientsForCommunication(
      institutionId,
      communication.id,
      communication.audience,
    );

    // Best-effort, asynchronous email dispatch. Never blocks nor rolls back the
    // publish if email fails; errors are sanitized and logged.
    void this.sendCommunicationEmails(institutionId, communication, userId);

    await this.auditService.log({
      userId,
      institutionId,
      action: 'COMMUNICATION_PUBLISHED',
      entityType: 'Communication',
      entityId: communication.id,
      oldValues: { status: existing.status },
      newValues: { status: communication.status, publishedAt: String(communication.publishedAt) },
      ipAddress,
    });

    return communication;
  }

  async deactivate(
    institutionId: string,
    communicationId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<Communication> {
    const existing = await this.prisma.communication.findFirst({
      where: {
        id: communicationId,
        institutionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Communication not found');
    }

    if (existing.status === CommunicationStatus.INACTIVE) {
      return existing;
    }

    const communication = await this.prisma.communication.update({
      where: { id: communicationId },
      data: { status: CommunicationStatus.INACTIVE },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'COMMUNICATION_DEACTIVATED',
      entityType: 'Communication',
      entityId: communication.id,
      oldValues: { status: existing.status },
      newValues: { status: communication.status },
      ipAddress,
    });

    return communication;
  }

  private async createRecipientsForCommunication(
    institutionId: string,
    communicationId: string,
    audience: CommunicationAudience,
  ): Promise<void> {
    // Find users with relevant roles
    const roleMap: Record<string, string[]> = {
      TEACHERS: ['TEACHER'],
      PARENTS: ['PARENT'],
      STUDENTS: ['STUDENT'],
    };

    const targetRoles =
      audience === CommunicationAudience.ALL
        ? ['TEACHER', 'PARENT', 'STUDENT']
        : roleMap[audience] || [];

    if (targetRoles.length === 0) return;

    const memberships = await this.prisma.userInstitution.findMany({
      where: {
        institutionId,
        roles: {
          some: {
            role: { name: { in: targetRoles } },
          },
        },
      },
      include: { user: { select: { id: true } } },
    });

    if (memberships.length === 0) return;

    const recipientData = memberships.map((m) => ({
      institutionId,
      communicationId,
      userId: m.userId,
    }));

    await this.prisma.communicationRecipient.createMany({
      data: recipientData,
      skipDuplicates: true,
    });
  }

  private async sendCommunicationEmails(
    institutionId: string,
    communication: Communication,
    publisherUserId: string,
  ): Promise<void> {
    try {
      const [recipients, institution] = await Promise.all([
        this.prisma.communicationRecipient.findMany({
          where: {
            institutionId,
            communicationId: communication.id,
            user: { status: 'ACTIVE' },
          },
          select: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        }),
        this.prisma.institution.findUnique({
          where: { id: institutionId },
          select: { name: true },
        }),
      ]);

      if (recipients.length === 0) return;

      const institutionName = institution?.name ?? '';
      const seen = new Set<string>();

      for (const r of recipients) {
        const u = r.user;
        // Actor exclusion + dedupe: never email the publisher twice and never
        // resend to the same user for the same publish.
        if (u.id === publisherUserId || seen.has(u.id)) continue;
        seen.add(u.id);
        if (!u.email) continue;

        const data = {
          to: u.email,
          recipientName: `${u.firstName} ${u.lastName}`.trim(),
          institutionName,
          title: communication.title,
          content: communication.content,
        };
        this.emailProvider.sendCommunication(data).catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`[comm ${communication.id}] email to ${u.email} failed: ${message}`);
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[comm ${communication.id}] email dispatch skipped: ${message}`);
    }
  }
}
