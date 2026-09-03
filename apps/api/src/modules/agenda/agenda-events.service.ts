import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import {
  AgendaEvent,
  AgendaEventStatus,
  CommunicationAudience,
  Prisma,
} from '@prisma/client';
import { CreateAgendaEventDto } from './dto/create-agenda-event.dto';
import { UpdateAgendaEventDto } from './dto/update-agenda-event.dto';
import { ListAgendaEventsQueryDto } from './dto/list-agenda-events-query.dto';

type AgendaRole = 'admin' | 'teacher' | 'parent' | 'student';

@Injectable()
export class AgendaEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateAgendaEventDto,
    userId: string,
    ipAddress?: string,
  ): Promise<AgendaEvent> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertValidRange(startAt, endAt);

    const event = await this.prisma.agendaEvent.create({
      data: {
        institutionId,
        createdById: userId,
        title: dto.title,
        description: dto.description ?? null,
        startAt,
        endAt,
        location: dto.location ?? null,
        audience: dto.audience ?? CommunicationAudience.ALL,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'EVENT_CREATED',
      entityType: 'AgendaEvent',
      entityId: event.id,
      newValues: {
        title: event.title,
        description: event.description,
        startAt: event.startAt,
        endAt: event.endAt,
        location: event.location,
        audience: event.audience,
        status: event.status,
      },
      ipAddress,
    });

    return event;
  }

  async findAll(
    institutionId: string,
    query: ListAgendaEventsQueryDto,
    userId: string,
  ): Promise<{
    data: AgendaEvent[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const role = await this.resolveRole(institutionId, userId);
    const start = query.start ? new Date(query.start) : undefined;
    const end = query.end ? new Date(query.end) : undefined;

    if (start && end && start.getTime() > end.getTime()) {
      throw new BadRequestException('start must be before or equal to end');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const and: Prisma.AgendaEventWhereInput[] = [];
    if (start) and.push({ endAt: { gte: start } });
    if (end) and.push({ startAt: { lte: end } });
    if (query.status) and.push({ status: query.status });
    if (query.audience) and.push({ audience: query.audience });
    if (query.search) {
      and.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }
    and.push(this.getVisibilityFilter(role, userId));

    const where: Prisma.AgendaEventWhereInput = { institutionId, AND: and };

    const [data, total] = await Promise.all([
      this.prisma.agendaEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startAt: 'asc' },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.agendaEvent.count({ where }),
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
    eventId: string,
    userId: string,
  ): Promise<AgendaEvent> {
    const role = await this.resolveRole(institutionId, userId);
    const where: Prisma.AgendaEventWhereInput = {
      id: eventId,
      institutionId,
      ...this.getVisibilityFilter(role, userId),
    };

    const event = await this.prisma.agendaEvent.findFirst({
      where,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Agenda event not found');
    }

    return event;
  }

  async update(
    institutionId: string,
    eventId: string,
    dto: UpdateAgendaEventDto,
    userId: string,
    ipAddress?: string,
  ): Promise<AgendaEvent> {
    const existing = await this.findOne(institutionId, eventId, userId);

    if (existing.status === AgendaEventStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a cancelled event');
    }

    let startAt = existing.startAt;
    let endAt = existing.endAt;
    if (dto.startAt !== undefined) startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) endAt = new Date(dto.endAt);
    this.assertValidRange(startAt, endAt);

    const data: Prisma.AgendaEventUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startAt !== undefined) data.startAt = startAt;
    if (dto.endAt !== undefined) data.endAt = endAt;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.audience !== undefined) data.audience = dto.audience;

    const event = await this.prisma.agendaEvent.update({
      where: { id: eventId },
      data,
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'EVENT_UPDATED',
      entityType: 'AgendaEvent',
      entityId: event.id,
      oldValues: {
        title: existing.title,
        description: existing.description,
        startAt: existing.startAt,
        endAt: existing.endAt,
        location: existing.location,
        audience: existing.audience,
        status: existing.status,
      },
      newValues: {
        title: event.title,
        description: event.description,
        startAt: event.startAt,
        endAt: event.endAt,
        location: event.location,
        audience: event.audience,
        status: event.status,
      },
      ipAddress,
    });

    return event;
  }

  async cancel(
    institutionId: string,
    eventId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<AgendaEvent> {
    const existing = await this.findOne(institutionId, eventId, userId);

    if (existing.status === AgendaEventStatus.CANCELLED) {
      throw new BadRequestException('Event is already cancelled');
    }

    const event = await this.prisma.agendaEvent.update({
      where: { id: eventId },
      data: { status: AgendaEventStatus.CANCELLED },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'EVENT_CANCELLED',
      entityType: 'AgendaEvent',
      entityId: event.id,
      oldValues: { status: existing.status },
      newValues: { status: event.status },
      ipAddress,
    });

    return event;
  }

  private assertValidRange(startAt: Date, endAt: Date): void {
    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException('endAt must be after startAt');
    }
  }

  private getVisibilityFilter(role: AgendaRole, userId: string): Prisma.AgendaEventWhereInput {
    if (role === 'teacher') {
      return {
        OR: [
          { audience: { in: [CommunicationAudience.ALL, CommunicationAudience.TEACHERS] } },
          { createdById: userId },
        ],
      };
    }
    if (role === 'parent') {
      return { audience: { in: [CommunicationAudience.ALL, CommunicationAudience.PARENTS] } };
    }
    if (role === 'student') {
      return { audience: { in: [CommunicationAudience.ALL, CommunicationAudience.STUDENTS] } };
    }
    return {};
  }

  private async resolveRole(institutionId: string, userId: string): Promise<AgendaRole> {
    const globalAdmin = await this.prisma.globalUserRole.findFirst({
      where: { userId, role: { name: 'SUPER_ADMIN' } },
    });
    if (globalAdmin) {
      return 'admin';
    }

    const membership = await this.prisma.userInstitution.findUnique({
      where: { userId_institutionId: { userId, institutionId } },
      include: { roles: { include: { role: true } } },
    });

    if (!membership) {
      return 'admin';
    }

    const roleNames = membership.roles.map((ur) => ur.role.name);

    if (roleNames.includes('INSTITUTION_ADMIN')) {
      return 'admin';
    }

    if (roleNames.includes('TEACHER')) {
      return 'teacher';
    }

    const student = await this.prisma.student.findFirst({
      where: { institutionId, userId },
      select: { id: true },
    });
    if (student) {
      return 'student';
    }

    const guardianLinks = await this.prisma.guardianStudent.findMany({
      where: {
        guardianUserId: userId,
        status: 'ACTIVE',
        student: { institutionId },
      },
      select: { studentId: true },
      take: 1,
    });
    if (guardianLinks.length > 0) {
      return 'parent';
    }

    return 'admin';
  }
}