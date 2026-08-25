import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ListSchedulesQueryDto } from './dto/list-schedules-query.dto';
import { Schedule, ScheduleStatus, DayOfWeek, Prisma } from '@prisma/client';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private timeStringToDate(time: string): Date {
    const [h, m, s] = time.split(':');
    const d = new Date(1970, 0, 1, Number(h), Number(m), Number(s || '0'));
    return d;
  }

  private dateToTimeString(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    return s === '00' ? `${h}:${m}` : `${h}:${m}:${s}`;
  }

  private async validateRelations(
    institutionId: string,
    courseId: string,
    subjectId: string,
  ): Promise<void> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, institutionId },
    });
    if (!course) {
      throw new NotFoundException('Course not found in this institution');
    }

    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, institutionId },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found in this institution');
    }
  }

  private validateTimeRange(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }
  }

  private async checkOverlap(
    institutionId: string,
    courseId: string,
    dayOfWeek: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    const start = this.timeStringToDate(startTime);
    const end = this.timeStringToDate(endTime);

    const where: Prisma.ScheduleWhereInput = {
      institutionId,
      courseId,
      dayOfWeek: dayOfWeek as DayOfWeek,
      status: 'ACTIVE',
      OR: [
        {
          startTime: { lt: end },
          endTime: { gt: start },
        },
      ],
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const overlap = await this.prisma.schedule.findFirst({ where });
    if (overlap) {
      throw new BadRequestException(
        `Schedule overlaps with an existing schedule for this course on ${dayOfWeek} (${String(overlap.startTime)} - ${String(overlap.endTime)})`,
      );
    }
  }

  async create(
    institutionId: string,
    dto: CreateScheduleDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Schedule> {
    await this.validateRelations(institutionId, dto.courseId, dto.subjectId);
    this.validateTimeRange(dto.startTime, dto.endTime);
    await this.checkOverlap(
      institutionId,
      dto.courseId,
      dto.dayOfWeek,
      dto.startTime,
      dto.endTime,
    );

    const schedule = await this.prisma.schedule.create({
      data: {
        institutionId,
        courseId: dto.courseId,
        subjectId: dto.subjectId,
        dayOfWeek: dto.dayOfWeek,
        startTime: this.timeStringToDate(dto.startTime),
        endTime: this.timeStringToDate(dto.endTime),
        classroom: dto.classroom,
        status: dto.status,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'SCHEDULE_CREATED',
      entityType: 'Schedule',
      entityId: schedule.id,
      newValues: {
        courseId: schedule.courseId,
        subjectId: schedule.subjectId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: this.dateToTimeString(schedule.startTime),
        endTime: this.dateToTimeString(schedule.endTime),
        classroom: schedule.classroom,
      },
      ipAddress,
    });

    return schedule;
  }

  async findAll(
    institutionId: string,
    query: ListSchedulesQueryDto,
  ): Promise<{ data: Schedule[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ScheduleWhereInput = {
      institutionId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.dayOfWeek ? { dayOfWeek: query.dayOfWeek } : {}),
      ...(query.search
        ? {
            OR: [
              { classroom: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.schedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.schedule.count({ where }),
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

  async findOne(institutionId: string, scheduleId: string): Promise<Schedule> {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        institutionId,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  async update(
    institutionId: string,
    scheduleId: string,
    dto: UpdateScheduleDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Schedule> {
    const existing = await this.prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        institutionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Schedule not found');
    }

    if (dto.courseId || dto.subjectId) {
      const courseId = dto.courseId ?? existing.courseId;
      const subjectId = dto.subjectId ?? existing.subjectId;
      await this.validateRelations(institutionId, courseId, subjectId);
    }

    const newStartTimeStr = dto.startTime ?? this.dateToTimeString(existing.startTime);
    const newEndTimeStr = dto.endTime ?? this.dateToTimeString(existing.endTime);
    this.validateTimeRange(newStartTimeStr, newEndTimeStr);

    const newDayOfWeek = dto.dayOfWeek ?? existing.dayOfWeek;
    const newCourseId = dto.courseId ?? existing.courseId;

    await this.checkOverlap(
      institutionId,
      newCourseId,
      String(newDayOfWeek),
      newStartTimeStr,
      newEndTimeStr,
      scheduleId,
    );

    const updateData: Prisma.ScheduleUpdateInput = {};
    if (dto.courseId !== undefined) updateData.course = { connect: { id: dto.courseId } };
    if (dto.subjectId !== undefined) updateData.subject = { connect: { id: dto.subjectId } };
    if (dto.dayOfWeek !== undefined) updateData.dayOfWeek = dto.dayOfWeek;
    if (dto.startTime !== undefined) updateData.startTime = this.timeStringToDate(dto.startTime);
    if (dto.endTime !== undefined) updateData.endTime = this.timeStringToDate(dto.endTime);
    if (dto.classroom !== undefined) updateData.classroom = dto.classroom;
    if (dto.status !== undefined) updateData.status = dto.status;

    const schedule = await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: dto.status && dto.status === ScheduleStatus.INACTIVE
        ? 'SCHEDULE_DEACTIVATED'
        : 'SCHEDULE_UPDATED',
      entityType: 'Schedule',
      entityId: schedule.id,
      oldValues: {
        courseId: existing.courseId,
        subjectId: existing.subjectId,
        dayOfWeek: existing.dayOfWeek,
        startTime: this.dateToTimeString(existing.startTime),
        endTime: this.dateToTimeString(existing.endTime),
        classroom: existing.classroom,
        status: existing.status,
      },
      newValues: {
        courseId: schedule.courseId,
        subjectId: schedule.subjectId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: this.dateToTimeString(schedule.startTime),
        endTime: this.dateToTimeString(schedule.endTime),
        classroom: schedule.classroom,
        status: schedule.status,
      },
      ipAddress,
    });

    return schedule;
  }

  async deactivate(
    institutionId: string,
    scheduleId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<Schedule> {
    return this.update(
      institutionId,
      scheduleId,
      { status: ScheduleStatus.INACTIVE },
      userId,
      ipAddress,
    );
  }
}
