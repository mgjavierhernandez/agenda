import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { resolveAccessibleCourseIds, resolveAccessibleStudentIds } from '../../common/auth/academic-scope';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ListSchedulesQueryDto } from './dto/list-schedules-query.dto';
import { ScheduleExportQueryDto, ScheduleExportFormat } from './dto/schedule-export-query.dto';
import {
  buildScheduleCsv,
  buildSchedulePdf,
  buildScheduleXlsx,
  ScheduleExportRow,
} from './schedule-export';
import {
  Schedule,
  ScheduleStatus,
  DayOfWeek,
  SubjectType,
  ClassroomType,
  Prisma,
} from '@prisma/client';

// Map subjects that require a specialized room to the allowed ClassroomType[]. Anything not listed
// here (or without a specific requirement) can use AULA/AUDITORIO as fallback.
const SUBJECT_TO_REQUIRED_ROOM: Record<string, ClassroomType[]> = {
  'Ciencias Naturales': [ClassroomType.LAB_FISICA, ClassroomType.LAB_QUIMICA],
  'Física': [ClassroomType.LAB_FISICA],
  'Química': [ClassroomType.LAB_QUIMICA],
  'Tecnología e Informática': [ClassroomType.COMPUTO],
  'Sistemas': [ClassroomType.COMPUTO],
  'Educación Física': [ClassroomType.CANCHA],
};

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
    academicPeriodId: string,
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

    const academicPeriod = await this.prisma.academicPeriod.findFirst({
      where: { id: academicPeriodId, institutionId },
    });
    if (!academicPeriod) {
      throw new NotFoundException('Academic period not found in this institution');
    }
  }

  private validateTimeRange(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }
  }

  private async validateTeacher(
    institutionId: string,
    teacherUserId: string,
    courseId: string,
    subjectId: string,
    academicPeriodId: string,
  ): Promise<void> {
    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: {
        institutionId,
        teacherUserId,
        courseId,
        subjectId,
        academicPeriodId,
        status: 'ACTIVE',
      },
    });
    if (!assignment) {
      throw new BadRequestException(
        'Teacher does not have an active assignment for this course/subject/academic period',
      );
    }
  }

  private async validateClassroom(
    institutionId: string,
    classroomId: string,
    subjectName: string,
    subjectType: SubjectType,
  ): Promise<void> {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, institutionId },
    });
    if (!classroom) {
      throw new NotFoundException('Classroom not found in this institution');
    }
    if (classroom.status !== 'ACTIVE') {
      throw new BadRequestException('Classroom is not active');
    }

    // Only enforce room-type compatibility for official/obligatory subjects; optative/transversal
    // subjects are flexible.
    if (subjectType === SubjectType.OBLIGATORIA || subjectType === SubjectType.PROFUNDIZACION) {
      const required = SUBJECT_TO_REQUIRED_ROOM[subjectName];
      if (required && !required.includes(classroom.type)) {
        throw new BadRequestException(
          `Subject "${subjectName}" requires a ${required.map((t) => t).join(' or ')} room`,
        );
      }
    }
  }

  private async validateBlockId(institutionId: string, blockId: string): Promise<void> {
    const block = await this.prisma.scheduleBlock.findFirst({
      where: { id: blockId, institutionId },
    });
    if (!block) {
      throw new NotFoundException('Schedule block not found in this institution');
    }
  }

  private async checkOverlap(
    institutionId: string,
    field: 'courseId' | 'teacherUserId' | 'classroomId',
    value: string | undefined,
    dayOfWeek: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    if (!value) return;

    const start = this.timeStringToDate(startTime);
    const end = this.timeStringToDate(endTime);

    const where: Prisma.ScheduleWhereInput = {
      institutionId,
      [field]: value,
      dayOfWeek: dayOfWeek as DayOfWeek,
      status: 'ACTIVE',
      OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const overlap = await this.prisma.schedule.findFirst({ where });
    if (overlap) {
      const label =
        field === 'teacherUserId'
          ? 'for this teacher'
          : field === 'classroomId'
            ? 'for this classroom'
            : 'for this course';
      throw new BadRequestException(
        `Schedule overlaps with an existing schedule ${label} on ${dayOfWeek} (${String(overlap.startTime)} - ${String(overlap.endTime)})`,
      );
    }
  }

  async create(
    institutionId: string,
    dto: CreateScheduleDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Schedule> {
    await this.validateRelations(
      institutionId,
      dto.courseId,
      dto.subjectId,
      dto.academicPeriodId,
    );
    this.validateTimeRange(dto.startTime, dto.endTime);

    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, institutionId },
    });

    if (dto.blockId) {
      await this.validateBlockId(institutionId, dto.blockId);
    }
    if (dto.teacherUserId) {
      await this.validateTeacher(
        institutionId,
        dto.teacherUserId,
        dto.courseId,
        dto.subjectId,
        dto.academicPeriodId,
      );
    }
    if (dto.classroomId && subject) {
      await this.validateClassroom(
        institutionId,
        dto.classroomId,
        subject.name,
        subject.subjectType,
      );
    }

    await this.checkOverlap(institutionId, 'courseId', dto.courseId, dto.dayOfWeek, dto.startTime, dto.endTime);
    await this.checkOverlap(institutionId, 'teacherUserId', dto.teacherUserId, dto.dayOfWeek, dto.startTime, dto.endTime);
    await this.checkOverlap(institutionId, 'classroomId', dto.classroomId, dto.dayOfWeek, dto.startTime, dto.endTime);

    const schedule = await this.prisma.schedule.create({
      data: {
        institutionId,
        courseId: dto.courseId,
        subjectId: dto.subjectId,
        academicPeriodId: dto.academicPeriodId,
        teacherUserId: dto.teacherUserId,
        classroomId: dto.classroomId,
        blockId: dto.blockId,
        dayOfWeek: dto.dayOfWeek,
        startTime: this.timeStringToDate(dto.startTime),
        endTime: this.timeStringToDate(dto.endTime),
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
        academicPeriodId: schedule.academicPeriodId,
        teacherUserId: schedule.teacherUserId,
        classroomId: schedule.classroomId,
        blockId: schedule.blockId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: this.dateToTimeString(schedule.startTime),
        endTime: this.dateToTimeString(schedule.endTime),
      },
      ipAddress,
    });

    return schedule;
  }

  async findAll(
    institutionId: string,
    query: ListSchedulesQueryDto,
    userId?: string,
  ): Promise<{ data: Schedule[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ScheduleWhereInput = {
      institutionId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.teacherUserId ? { teacherUserId: query.teacherUserId } : {}),
      ...(query.classroomId ? { classroomId: query.classroomId } : {}),
      ...(query.blockId ? { blockId: query.blockId } : {}),
      ...(query.academicPeriodId ? { academicPeriodId: query.academicPeriodId } : {}),
      ...(query.dayOfWeek ? { dayOfWeek: query.dayOfWeek } : {}),
      ...(query.search
        ? {
            classroom: { name: { contains: query.search, mode: 'insensitive' } },
          }
        : {}),
    };

    if (userId) {
      const accessible = await resolveAccessibleCourseIds(this.prisma, institutionId, userId);
      if (accessible !== null) {
        let effectiveCourses = accessible;
        if (query.studentId) {
          const accessibleStudents = await resolveAccessibleStudentIds(this.prisma, institutionId, userId);
          if (accessibleStudents === null || !accessibleStudents.includes(query.studentId)) {
            throw new NotFoundException('Schedule not found');
          }
          const enrollments = await this.prisma.enrollment.findMany({
            where: { institutionId, studentId: query.studentId, status: 'ACTIVE' },
            select: { courseId: true },
          });
          effectiveCourses = [...new Set(enrollments.map((e) => e.courseId))].filter((c) =>
            accessible.includes(c),
          );
        }
        if (query.courseId && !effectiveCourses.includes(query.courseId)) {
          throw new NotFoundException('Schedule not found');
        }
        if (!query.courseId) {
          // Docentes ven además los bloques donde son el profesor asignado.
          const or: Prisma.ScheduleWhereInput[] = [{ courseId: { in: effectiveCourses } }];
          const own = await this.prisma.schedule.findFirst({
            where: { institutionId, teacherUserId: userId },
            select: { id: true },
          });
          if (own && !query.studentId) or.push({ teacherUserId: userId });
          where.OR = or;
        }
      }
    }

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

  async findOne(institutionId: string, scheduleId: string, userId?: string): Promise<Schedule> {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        institutionId,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (userId) {
      const accessible = await resolveAccessibleCourseIds(this.prisma, institutionId, userId);
      if (
        accessible !== null &&
        !accessible.includes(schedule.courseId) &&
        schedule.teacherUserId !== userId
      ) {
        throw new NotFoundException('Schedule not found');
      }
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

    const courseId = dto.courseId ?? existing.courseId;
    const subjectId = dto.subjectId ?? existing.subjectId;
    const academicPeriodId = dto.academicPeriodId ?? existing.academicPeriodId;
    if (academicPeriodId && (dto.courseId || dto.subjectId || dto.academicPeriodId)) {
      await this.validateRelations(institutionId, courseId, subjectId, academicPeriodId);
    }

    const newStartTimeStr = dto.startTime ?? this.dateToTimeString(existing.startTime);
    const newEndTimeStr = dto.endTime ?? this.dateToTimeString(existing.endTime);
    this.validateTimeRange(newStartTimeStr, newEndTimeStr);

    const newDayOfWeek = dto.dayOfWeek ?? existing.dayOfWeek;
    const newTeacherUserId = dto.teacherUserId ?? existing.teacherUserId ?? undefined;
    const newClassroomId = dto.classroomId ?? existing.classroomId ?? undefined;
    const newBlockId = dto.blockId ?? existing.blockId ?? undefined;

    if (newBlockId && dto.blockId) {
      await this.validateBlockId(institutionId, newBlockId);
    }
    if (newTeacherUserId && academicPeriodId && (dto.teacherUserId || dto.subjectId || dto.courseId || dto.academicPeriodId)) {
      await this.validateTeacher(
        institutionId,
        newTeacherUserId,
        courseId,
        subjectId,
        academicPeriodId,
      );
    }
    if (dto.classroomId) {
      const subject = await this.prisma.subject.findFirst({
        where: { id: subjectId, institutionId },
      });
      if (subject) {
        await this.validateClassroom(institutionId, newClassroomId!, subject.name, subject.subjectType);
      }
    }

    await this.checkOverlap(institutionId, 'courseId', courseId, String(newDayOfWeek), newStartTimeStr, newEndTimeStr, scheduleId);
    await this.checkOverlap(institutionId, 'teacherUserId', newTeacherUserId, String(newDayOfWeek), newStartTimeStr, newEndTimeStr, scheduleId);
    await this.checkOverlap(institutionId, 'classroomId', newClassroomId, String(newDayOfWeek), newStartTimeStr, newEndTimeStr, scheduleId);

    const updateData: Prisma.ScheduleUpdateInput = {};
    if (dto.courseId !== undefined) updateData.course = { connect: { id: dto.courseId } };
    if (dto.subjectId !== undefined) updateData.subject = { connect: { id: dto.subjectId } };
    if (dto.academicPeriodId !== undefined) updateData.academicPeriod = { connect: { id: dto.academicPeriodId } };
    if (dto.teacherUserId !== undefined) {
      updateData.teacherUser = dto.teacherUserId
        ? { connect: { id: dto.teacherUserId } }
        : { disconnect: true };
    }
    if (dto.classroomId !== undefined) {
      updateData.classroom = dto.classroomId
        ? { connect: { id: dto.classroomId } }
        : { disconnect: true };
    }
    if (dto.blockId !== undefined) {
      updateData.block = dto.blockId ? { connect: { id: dto.blockId } } : { disconnect: true };
    }
    if (dto.dayOfWeek !== undefined) updateData.dayOfWeek = dto.dayOfWeek;
    if (dto.startTime !== undefined) updateData.startTime = this.timeStringToDate(dto.startTime);
    if (dto.endTime !== undefined) updateData.endTime = this.timeStringToDate(dto.endTime);
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
        academicPeriodId: existing.academicPeriodId,
        teacherUserId: existing.teacherUserId,
        classroomId: existing.classroomId,
        blockId: existing.blockId,
        dayOfWeek: existing.dayOfWeek,
        startTime: this.dateToTimeString(existing.startTime),
        endTime: this.dateToTimeString(existing.endTime),
        status: existing.status,
      },
      newValues: {
        courseId: schedule.courseId,
        subjectId: schedule.subjectId,
        academicPeriodId: schedule.academicPeriodId,
        teacherUserId: schedule.teacherUserId,
        classroomId: schedule.classroomId,
        blockId: schedule.blockId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: this.dateToTimeString(schedule.startTime),
        endTime: this.dateToTimeString(schedule.endTime),
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

  /**
   * Exporta el horario visible para el actor (mismo scoping que findAll).
   * El archivo solo contiene datos del alcance autorizado.
   */
  async exportSchedules(
    institutionId: string,
    userId: string,
    query: ScheduleExportQueryDto,
    ipAddress?: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const format = query.format ?? ScheduleExportFormat.PDF;
    const { data } = await this.findAll(
      institutionId,
      {
        page: 1,
        limit: 500,
        status: ScheduleStatus.ACTIVE,
        dayOfWeek: query.dayOfWeek,
        courseId: query.courseId,
        studentId: query.studentId,
      },
      userId,
    );

    const [courses, subjects, classrooms, users, institution] = await Promise.all([
      this.prisma.course.findMany({
        where: { institutionId, id: { in: [...new Set(data.map((s) => s.courseId))] } },
        select: { id: true, name: true },
      }),
      this.prisma.subject.findMany({
        where: { institutionId, id: { in: [...new Set(data.map((s) => s.subjectId))] } },
        select: { id: true, name: true },
      }),
      this.prisma.classroom.findMany({
        where: { institutionId, id: { in: [...new Set(data.map((s) => s.classroomId).filter(Boolean) as string[])] } },
        select: { id: true, name: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: [...new Set(data.map((s) => s.teacherUserId).filter(Boolean) as string[])] } },
        select: { id: true, firstName: true, lastName: true },
      }),
      this.prisma.institution.findUnique({ where: { id: institutionId }, select: { name: true } }),
    ]);

    const courseNames = new Map(courses.map((c) => [c.id, c.name]));
    const subjectNames = new Map(subjects.map((s) => [s.id, s.name]));
    const classroomNames = new Map(classrooms.map((c) => [c.id, c.name]));
    const teacherNames = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));

    const rows: ScheduleExportRow[] = data.map((s) => ({
      day: s.dayOfWeek,
      startTime: this.dateToTimeString(s.startTime),
      endTime: this.dateToTimeString(s.endTime),
      courseName: courseNames.get(s.courseId) ?? '—',
      subjectName: subjectNames.get(s.subjectId) ?? '—',
      classroomName: (s.classroomId && classroomNames.get(s.classroomId)) || '—',
      teacherName: (s.teacherUserId && teacherNames.get(s.teacherUserId)) || '—',
    }));

    await this.auditService.log({
      userId,
      institutionId,
      action: 'SCHEDULE_EXPORTED',
      entityType: 'Schedule',
      newValues: { format, rows: rows.length },
      ipAddress,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    if (format === ScheduleExportFormat.XLSX) {
      return {
        buffer: await buildScheduleXlsx(rows),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `horario-${stamp}.xlsx`,
      };
    }
    if (format === ScheduleExportFormat.CSV) {
      return {
        buffer: buildScheduleCsv(rows),
        contentType: 'text/csv; charset=utf-8',
        filename: `horario-${stamp}.csv`,
      };
    }
    return {
      buffer: await buildSchedulePdf(
        institution?.name ?? 'Institución',
        `Horario de clases (${rows.length} bloques)`,
        rows,
      ),
      contentType: 'application/pdf',
      filename: `horario-${stamp}.pdf`,
    };
  }
}
