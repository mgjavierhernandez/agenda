import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateTeacherAssignmentDto } from './dto/create-teacher-assignment.dto';
import { UpdateTeacherAssignmentDto } from './dto/update-teacher-assignment.dto';
import { ListTeacherAssignmentsQueryDto } from './dto/list-teacher-assignments-query.dto';
import { CreateCourseDirectorAssignmentDto } from './dto/create-course-director-assignment.dto';
import { UpdateCourseDirectorAssignmentDto } from './dto/update-course-director-assignment.dto';
import { ListCourseDirectorAssignmentsQueryDto } from './dto/list-course-director-assignments-query.dto';
import { TeacherAssignment, TeacherAssignmentStatus, CourseDirectorAssignment, CourseDirectorStatus, Prisma } from '@prisma/client';

const TEACHER_ROLE = 'TEACHER';
const DIRECTOR_DE_GRUPO_ROLE = 'DIRECTOR_DE_GRUPO';

@Injectable()
export class TeacherAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async validateWorkload(
    institutionId: string,
    teacherUserId: string,
    academicPeriodId: string,
    requestedHours: number,
    maxWeeklyHours: number,
    excludeAssignmentId?: string,
  ): Promise<void> {
    const assignments = await this.prisma.teacherAssignment.findMany({
      where: {
        institutionId,
        teacherUserId,
        academicPeriodId,
        status: 'ACTIVE',
        ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
      },
      select: { weeklyHours: true },
    });

    const currentLoad = assignments.reduce((sum, a) => sum + a.weeklyHours, 0);
    const projectedLoad = currentLoad + requestedHours;
    if (projectedLoad > maxWeeklyHours) {
      throw new BadRequestException(
        `Teacher workload would exceed max weekly hours (${projectedLoad} > ${maxWeeklyHours})`,
      );
    }
  }

  async create(
    institutionId: string,
    dto: CreateTeacherAssignmentDto,
    userId: string,
    ip?: string,
  ): Promise<TeacherAssignment> {
    const teacherMembership = await this.prisma.userInstitution.findFirst({
      where: { userId: dto.teacherUserId, institutionId, status: 'ACTIVE' },
    });
    if (!teacherMembership) throw new ForbiddenException('Teacher user does not belong to this institution');

    const [course, subject, academicPeriod] = await Promise.all([
      this.prisma.course.findFirst({ where: { id: dto.courseId, institutionId } }),
      this.prisma.subject.findFirst({ where: { id: dto.subjectId, institutionId } }),
      this.prisma.academicPeriod.findFirst({ where: { id: dto.academicPeriodId, institutionId } }),
    ]);
    if (!course) throw new NotFoundException('Course not found in this institution');
    if (!subject) throw new NotFoundException('Subject not found in this institution');
    if (!academicPeriod) throw new NotFoundException('Academic period not found in this institution');

    const existing = await this.prisma.teacherAssignment.findUnique({
      where: {
        institutionId_teacherUserId_courseId_subjectId_academicPeriodId: {
          institutionId,
          teacherUserId: dto.teacherUserId,
          courseId: dto.courseId,
          subjectId: dto.subjectId,
          academicPeriodId: dto.academicPeriodId,
        },
      },
    });
    if (existing) throw new ConflictException('Teacher assignment already exists for this combination');

    const weeklyHours = dto.weeklyHours ?? 0;
    const maxWeeklyHours = dto.maxWeeklyHours ?? 22;
    await this.validateWorkload(
      institutionId,
      dto.teacherUserId,
      dto.academicPeriodId,
      weeklyHours,
      maxWeeklyHours,
    );

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.endDate && new Date(dto.endDate) < new Date(dto.startDate!)) {
      throw new BadRequestException('End date cannot be before start date');
    }

    const { assignment, backfilled, skipped } = await this.prisma.$transaction(async (tx) => {
      const created = await tx.teacherAssignment.create({
        data: {
          institutionId,
          teacherUserId: dto.teacherUserId,
          courseId: dto.courseId,
          subjectId: dto.subjectId,
          academicPeriodId: dto.academicPeriodId,
          weeklyHours,
          maxWeeklyHours,
          startDate,
          endDate,
        },
      });

      const backfill = await this.backfillPendingSchedules(
        tx,
        institutionId,
        dto.teacherUserId,
        dto.courseId,
        dto.subjectId,
        dto.academicPeriodId,
      );

      return { assignment: created, backfilled: backfill.updated, skipped: backfill.skipped };
    });

    await this.auditService.log({
      action: 'TEACHER_ASSIGNMENT_CREATED',
      entityType: 'TeacherAssignment',
      entityId: assignment.id,
      institutionId,
      userId,
      newValues: { teacherUserId: dto.teacherUserId, courseId: dto.courseId, subjectId: dto.subjectId, academicPeriodId: dto.academicPeriodId, weeklyHours, maxWeeklyHours, startDate: dto.startDate, endDate: dto.endDate },
      ipAddress: ip,
    });

    if (backfilled > 0 || skipped > 0) {
      await this.auditService.log({
        action: 'SCHEDULE_TEACHER_BACKFILLED',
        entityType: 'TeacherAssignment',
        entityId: assignment.id,
        institutionId,
        userId,
        newValues: { teacherUserId: dto.teacherUserId, updated: backfilled, skipped },
        ipAddress: ip,
      });
    }

    return assignment;
  }

  /**
   * Assigns the teacher to pending schedules (teacherUserId IS NULL) of the
   * same course/subject/period. Schedules that already have a teacher are
   * never touched; schedules conflicting with the teacher's load are skipped.
   */
  private async backfillPendingSchedules(
    tx: Prisma.TransactionClient,
    institutionId: string,
    teacherUserId: string,
    courseId: string,
    subjectId: string,
    academicPeriodId: string,
  ): Promise<{ updated: number; skipped: number }> {
    const pending = await tx.schedule.findMany({
      where: {
        institutionId,
        courseId,
        subjectId,
        academicPeriodId,
        teacherUserId: null,
        status: 'ACTIVE',
      },
      select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
    });

    if (pending.length === 0) {
      return { updated: 0, skipped: 0 };
    }

    const teacherSchedules = await tx.schedule.findMany({
      where: { institutionId, teacherUserId, status: 'ACTIVE' },
      select: { dayOfWeek: true, startTime: true, endTime: true },
    });

    const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean =>
      aStart < bEnd && aEnd > bStart;

    const safeIds: string[] = [];
    let skipped = 0;
    for (const slot of pending) {
      const conflict = teacherSchedules.some(
        (t) =>
          t.dayOfWeek === slot.dayOfWeek &&
          overlaps(slot.startTime, slot.endTime, t.startTime, t.endTime),
      );
      if (conflict) {
        skipped += 1;
      } else {
        safeIds.push(slot.id);
      }
    }

    if (safeIds.length > 0) {
      await tx.schedule.updateMany({
        where: { id: { in: safeIds } },
        data: { teacherUserId },
      });
    }

    return { updated: safeIds.length, skipped };
  }

  async findAll(
    institutionId: string,
    query: ListTeacherAssignmentsQueryDto,
  ): Promise<{ data: TeacherAssignment[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TeacherAssignmentWhereInput = {
      institutionId,
      ...(query.teacherUserId && { teacherUserId: query.teacherUserId }),
      ...(query.courseId && { courseId: query.courseId }),
      ...(query.subjectId && { subjectId: query.subjectId }),
      ...(query.academicPeriodId && { academicPeriodId: query.academicPeriodId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.teacherAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.teacherAssignment.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(institutionId: string, id: string): Promise<TeacherAssignment & { autoBackfilled: number }> {
    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: { id, institutionId },
    });
    if (!assignment) throw new NotFoundException('Teacher assignment not found');
    // Origen automático inferido sin migración: nº de horarios auto-asignados
    // registrados en auditoría (SCHEDULE_TEACHER_BACKFILLED). Informativo, no editable.
    const backfillLogs = await this.prisma.auditLog.findMany({
      where: { institutionId, action: 'SCHEDULE_TEACHER_BACKFILLED', entityType: 'TeacherAssignment', entityId: id },
      select: { newValues: true },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    const autoBackfilled =
      backfillLogs.length > 0 && backfillLogs[0].newValues && typeof backfillLogs[0].newValues === 'object'
        ? Number((backfillLogs[0].newValues as Record<string, unknown>).updated ?? 0)
        : 0;
    return { ...assignment, autoBackfilled };
  }

  async getDirectors(institutionId: string): Promise<Array<{
    teacherUserId: string;
    firstName: string;
    lastName: string;
    email: string;
  }>> {
    const memberships = await this.prisma.userInstitution.findMany({
      where: {
        institutionId,
        status: 'ACTIVE',
        roles: { some: { role: { name: DIRECTOR_DE_GRUPO_ROLE } } },
      },
      select: {
        userId: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      teacherUserId: m.userId,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      email: m.user.email,
    }));
  }

  async getTeachers(institutionId: string): Promise<Array<{
    teacherUserId: string;
    firstName: string;
    lastName: string;
    email: string;
    isDirector: boolean;
    courses: Array<{
      courseId: string;
      courseName: string;
      subjectId: string;
      subjectName: string;
      academicPeriodId: string;
      students: Array<{ studentId: string; firstName: string; lastName: string }>;
    }>;
  }>> {
    const memberships = await this.prisma.userInstitution.findMany({
      where: {
        institutionId,
        status: 'ACTIVE',
        roles: { some: { role: { name: TEACHER_ROLE } } },
      },
      select: {
        userId: true,
        roles: { where: { role: { name: DIRECTOR_DE_GRUPO_ROLE } }, select: { id: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (memberships.length === 0) return [];

    const teacherIds = memberships.map((m) => m.userId);

    const assignments = await this.prisma.teacherAssignment.findMany({
      where: { institutionId, teacherUserId: { in: teacherIds } },
      orderBy: { createdAt: 'asc' },
      include: {
        course: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    const enrollments = await this.prisma.enrollment.findMany({
      where: { institutionId, status: 'ACTIVE' },
      select: {
        courseId: true,
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const studentsByCourse = new Map<string, Array<{ studentId: string; firstName: string; lastName: string }>>();
    for (const enrollment of enrollments) {
      const list = studentsByCourse.get(enrollment.courseId) ?? [];
      list.push({
        studentId: enrollment.student.id,
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
      });
      studentsByCourse.set(enrollment.courseId, list);
    }

    return memberships.map((m) => ({
      teacherUserId: m.userId,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      email: m.user.email,
      isDirector: m.roles.length > 0,
      courses: assignments
        .filter((a) => a.teacherUserId === m.userId)
        .map((a) => ({
          courseId: a.courseId,
          courseName: a.course.name,
          subjectId: a.subjectId,
          subjectName: a.subject.name,
          academicPeriodId: a.academicPeriodId,
          students: studentsByCourse.get(a.courseId) ?? [],
        })),
    }));
  }

  async update(
    institutionId: string,
    id: string,
    dto: UpdateTeacherAssignmentDto,
    userId: string,
    ip?: string,
  ): Promise<TeacherAssignment> {
    const existing = await this.findOne(institutionId, id);

    const data: Prisma.TeacherAssignmentUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.weeklyHours !== undefined) data.weeklyHours = dto.weeklyHours;
    if (dto.maxWeeklyHours !== undefined) data.maxWeeklyHours = dto.maxWeeklyHours;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;

    const nextWeeklyHours = dto.weeklyHours ?? existing.weeklyHours;
    const nextMaxWeeklyHours = dto.maxWeeklyHours ?? existing.maxWeeklyHours;
    if (dto.weeklyHours !== undefined || dto.maxWeeklyHours !== undefined) {
      await this.validateWorkload(
        institutionId,
        existing.teacherUserId,
        existing.academicPeriodId,
        nextWeeklyHours,
        nextMaxWeeklyHours,
        existing.id,
      );
    }

    // Validate date consistency
    const newStartDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const newEndDate = dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : existing.endDate;
    if (newEndDate && newEndDate < newStartDate) {
      throw new BadRequestException('End date cannot be before start date');
    }

    const assignment = await this.prisma.teacherAssignment.update({
      where: { id: existing.id },
      data,
    });

    await this.auditService.log({
      action: 'TEACHER_ASSIGNMENT_UPDATED',
      entityType: 'TeacherAssignment',
      entityId: assignment.id,
      institutionId,
      userId,
      newValues: { changes: dto },
      ipAddress: ip,
    });

    return assignment;
  }

  async deactivate(
    institutionId: string,
    id: string,
    userId: string,
    ip?: string,
  ): Promise<TeacherAssignment> {
    const existing = await this.findOne(institutionId, id);

    const assignment = await this.prisma.teacherAssignment.update({
      where: { id: existing.id },
      data: { status: TeacherAssignmentStatus.INACTIVE },
    });

    await this.auditService.log({
      action: 'TEACHER_ASSIGNMENT_DEACTIVATED',
      entityType: 'TeacherAssignment',
      entityId: assignment.id,
      institutionId,
      userId,
      newValues: { previousStatus: existing.status },
      ipAddress: ip,
    });

    return assignment;
  }

  // ============ CourseDirectorAssignment methods ============

  async createCourseDirector(
    institutionId: string,
    dto: CreateCourseDirectorAssignmentDto,
    userId: string,
    ip?: string,
  ): Promise<CourseDirectorAssignment> {
    const directorMembership = await this.prisma.userInstitution.findFirst({
      where: { userId: dto.directorUserId, institutionId, status: 'ACTIVE' },
    });
    if (!directorMembership) throw new ForbiddenException('Director user does not belong to this institution');

    const [course, academicPeriod] = await Promise.all([
      this.prisma.course.findFirst({ where: { id: dto.courseId, institutionId } }),
      this.prisma.academicPeriod.findFirst({ where: { id: dto.academicPeriodId, institutionId } }),
    ]);
    if (!course) throw new NotFoundException('Course not found in this institution');
    if (!academicPeriod) throw new NotFoundException('Academic period not found in this institution');

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (endDate && endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }

    const existing = await this.prisma.courseDirectorAssignment.findFirst({
      where: {
        institutionId,
        courseId: dto.courseId,
        academicPeriodId: dto.academicPeriodId,
        status: CourseDirectorStatus.ACTIVE,
      },
    });
    if (existing) throw new ConflictException('An active director assignment already exists for this course and period');

    const assignment = await this.prisma.courseDirectorAssignment.create({
      data: {
        institutionId,
        directorUserId: dto.directorUserId,
        courseId: dto.courseId,
        academicPeriodId: dto.academicPeriodId,
        startDate,
        endDate,
        status: dto.status ?? CourseDirectorStatus.ACTIVE,
      },
    });

    await this.auditService.log({
      action: 'COURSE_DIRECTOR_ASSIGNMENT_CREATED',
      entityType: 'CourseDirectorAssignment',
      entityId: assignment.id,
      institutionId,
      userId,
      newValues: { directorUserId: dto.directorUserId, courseId: dto.courseId, academicPeriodId: dto.academicPeriodId, startDate: dto.startDate, endDate: dto.endDate },
      ipAddress: ip,
    });

    return assignment;
  }

  async findAllCourseDirectors(
    institutionId: string,
    query: ListCourseDirectorAssignmentsQueryDto,
  ): Promise<{ data: CourseDirectorAssignment[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CourseDirectorAssignmentWhereInput = {
      institutionId,
      ...(query.directorUserId && { directorUserId: query.directorUserId }),
      ...(query.courseId && { courseId: query.courseId }),
      ...(query.academicPeriodId && { academicPeriodId: query.academicPeriodId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.courseDirectorAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          directorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          course: { select: { id: true, name: true, code: true } },
          academicPeriod: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.courseDirectorAssignment.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOneCourseDirector(institutionId: string, id: string): Promise<CourseDirectorAssignment> {
    const assignment = await this.prisma.courseDirectorAssignment.findFirst({
      where: { id, institutionId },
      include: {
        directorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, name: true, code: true } },
        academicPeriod: { select: { id: true, name: true, code: true } },
      },
    });
    if (!assignment) throw new NotFoundException('Course director assignment not found');
    return assignment;
  }

  async getCurrentDirector(institutionId: string, courseId: string, academicPeriodId: string): Promise<CourseDirectorAssignment | null> {
    return this.prisma.courseDirectorAssignment.findFirst({
      where: {
        institutionId,
        courseId,
        academicPeriodId,
        status: CourseDirectorStatus.ACTIVE,
        startDate: { lte: new Date() },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
      include: {
        directorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async getDirectorHistory(institutionId: string, courseId: string, academicPeriodId: string): Promise<CourseDirectorAssignment[]> {
    return this.prisma.courseDirectorAssignment.findMany({
      where: {
        institutionId,
        courseId,
        academicPeriodId,
      },
      orderBy: { startDate: 'desc' },
      include: {
        directorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async updateCourseDirector(
    institutionId: string,
    id: string,
    dto: UpdateCourseDirectorAssignmentDto,
    userId: string,
    ip?: string,
  ): Promise<CourseDirectorAssignment> {
    const existing = await this.findOneCourseDirector(institutionId, id);

    if (dto.endDate !== undefined) {
      const endDate = new Date(dto.endDate);
      if (endDate < existing.startDate) {
        throw new BadRequestException('End date cannot be before start date');
      }
    }

    // Reactivation guard: only one ACTIVE director per course+period is allowed.
    // (The partial unique index is the backstop; this produces a clean 409.)
    if (dto.status === CourseDirectorStatus.ACTIVE && existing.status !== CourseDirectorStatus.ACTIVE) {
      const otherActive = await this.prisma.courseDirectorAssignment.findFirst({
        where: {
          institutionId,
          courseId: existing.courseId,
          academicPeriodId: existing.academicPeriodId,
          status: CourseDirectorStatus.ACTIVE,
          id: { not: existing.id },
        },
        select: { id: true },
      });
      if (otherActive) {
        throw new ConflictException('An active director assignment already exists for this course and period');
      }
    }

    const data: Prisma.CourseDirectorAssignmentUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);

    const assignment = await this.prisma.courseDirectorAssignment.update({
      where: { id: existing.id },
      data,
      include: {
        directorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, name: true, code: true } },
        academicPeriod: { select: { id: true, name: true, code: true } },
      },
    });

    await this.auditService.log({
      action: 'COURSE_DIRECTOR_ASSIGNMENT_UPDATED',
      entityType: 'CourseDirectorAssignment',
      entityId: assignment.id,
      institutionId,
      userId,
      newValues: { changes: dto },
      ipAddress: ip,
    });

    return assignment;
  }

  async deactivateCourseDirector(
    institutionId: string,
    id: string,
    userId: string,
    ip?: string,
  ): Promise<CourseDirectorAssignment> {
    const existing = await this.findOneCourseDirector(institutionId, id);

    const assignment = await this.prisma.courseDirectorAssignment.update({
      where: { id: existing.id },
      data: { status: CourseDirectorStatus.INACTIVE },
    });

    await this.auditService.log({
      action: 'COURSE_DIRECTOR_ASSIGNMENT_DEACTIVATED',
      entityType: 'CourseDirectorAssignment',
      entityId: assignment.id,
      institutionId,
      userId,
      newValues: { previousStatus: existing.status },
      ipAddress: ip,
    });

    return assignment;
  }
}
