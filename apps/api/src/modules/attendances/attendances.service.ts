import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import {
  AttendanceAuthorizationService,
} from './attendance-authorization';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { ListAttendancesQueryDto } from './dto/list-attendances-query.dto';
import { CreateAttendanceBulkDto } from './dto/create-attendance-bulk.dto';
import { Attendance, Prisma } from '@prisma/client';

@Injectable()
export class AttendancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authorizationService: AttendanceAuthorizationService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateAttendanceDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Attendance> {
    const role = await this.authorizationService.getUserRole(userId, institutionId);
    if (!role) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const access = await this.authorizationService.canCreate(
      userId,
      institutionId,
      dto.studentId,
      dto.courseId,
      dto.academicPeriodId,
      role,
    );
    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      if (access.reason === 'NO_COURSE_RELATIONSHIP' || access.reason === 'NO_STUDENT_RELATIONSHIP') {
        throw new NotFoundException('Student or course not found');
      }
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.validateIdentifiableResources(institutionId, dto.studentId, dto.courseId, dto.academicPeriodId);

    const attendance = await this.prisma.$transaction(async (tx) => {
      await this.assertPeriodOpen(tx, institutionId, dto.academicPeriodId);

      const existing = await tx.attendance.findUnique({
        where: {
          institutionId_studentId_courseId_date: {
            institutionId,
            studentId: dto.studentId,
            courseId: dto.courseId,
            date: this.toDateOnly(dto.date),
          },
        },
      });
      if (existing) {
        throw new BadRequestException('Attendance already recorded for this student, course and date');
      }

      return tx.attendance.create({
        data: {
          institutionId,
          studentId: dto.studentId,
          courseId: dto.courseId,
          academicPeriodId: dto.academicPeriodId,
          date: this.toDateOnly(dto.date),
          status: dto.status,
          notes: dto.notes ?? null,
          recordedById: userId,
        },
      });
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'ATTENDANCE_CREATED',
      entityType: 'Attendance',
      entityId: attendance.id,
      newValues: {
        studentId: attendance.studentId,
        courseId: attendance.courseId,
        academicPeriodId: attendance.academicPeriodId,
        date: attendance.date.toISOString().slice(0, 10),
        status: attendance.status,
        notes: attendance.notes ?? null,
      },
      ipAddress,
    });

    return attendance;
  }

  async findAll(
    institutionId: string,
    query: ListAttendancesQueryDto,
    userId: string,
  ): Promise<{ data: Attendance[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const role = await this.authorizationService.getUserRole(userId, institutionId);
    if (!role || role === 'SUPER_ADMIN') {
      return { data: [], meta: { page: 1, limit: query.limit ?? 20, total: 0, totalPages: 0 } };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const baseFilter = this.authorizationService.buildListFilter(userId, institutionId, role);

    const where: Prisma.AttendanceWhereInput = {
      ...baseFilter,
      institutionId,
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.academicPeriodId ? { academicPeriodId: query.academicPeriodId } : {}),
      ...(query.date ? { date: this.toDateOnly(query.date) } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              ...(query.dateFrom ? { gte: this.toDateRangeStart(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: this.toDateRangeEnd(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          course: { select: { id: true, name: true, code: true } },
          academicPeriod: { select: { id: true, name: true, code: true } },
          recordedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.attendance.count({ where }),
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
    attendanceId: string,
    userId: string,
  ): Promise<Attendance> {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id: attendanceId, institutionId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        course: { select: { id: true, name: true, code: true } },
        academicPeriod: { select: { id: true, name: true, code: true } },
        recordedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }

    const role = await this.authorizationService.getUserRole(userId, institutionId);
    const access = await this.authorizationService.canRead(
      userId,
      institutionId,
      attendance,
      role ?? '',
    );

    if (!access.allowed) {
      throw new NotFoundException('Attendance not found');
    }

    return attendance;
  }

  async update(
    institutionId: string,
    attendanceId: string,
    dto: UpdateAttendanceDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Attendance> {
    const existing = await this.prisma.attendance.findFirst({
      where: { id: attendanceId, institutionId },
    });

    if (!existing) {
      throw new NotFoundException('Attendance not found');
    }

    const role = await this.authorizationService.getUserRole(userId, institutionId);
    const access = await this.authorizationService.canModify(
      userId,
      institutionId,
      existing,
      role ?? '',
    );

    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      if (access.reason === 'NO_COURSE_RELATIONSHIP') {
        throw new NotFoundException('Attendance not found');
      }
      throw new ForbiddenException('Insufficient permissions');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.assertPeriodOpen(tx, institutionId, existing.academicPeriodId);

      const updateData: Prisma.AttendanceUpdateInput = {};
      if (dto.status !== undefined) updateData.status = dto.status;
      if (dto.notes !== undefined) updateData.notes = dto.notes;

      return tx.attendance.update({
        where: { id: attendanceId },
        data: updateData,
      });
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'ATTENDANCE_UPDATED',
      entityType: 'Attendance',
      entityId: updated.id,
      oldValues: {
        status: existing.status,
        notes: existing.notes ?? null,
      },
      newValues: {
        status: updated.status,
        notes: updated.notes ?? null,
      },
      ipAddress,
    });

    return updated;
  }

  async remove(
    institutionId: string,
    attendanceId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<{ success: boolean }> {
    const existing = await this.prisma.attendance.findFirst({
      where: { id: attendanceId, institutionId },
    });

    if (!existing) {
      throw new NotFoundException('Attendance not found');
    }

    const role = await this.authorizationService.getUserRole(userId, institutionId);
    const access = await this.authorizationService.canDelete(
      userId,
      institutionId,
      existing,
      role ?? '',
    );

    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.assertPeriodOpen(tx, institutionId, existing.academicPeriodId);
      await tx.attendance.delete({
        where: { id: attendanceId },
      });
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'ATTENDANCE_DELETED',
      entityType: 'Attendance',
      entityId: attendanceId,
      oldValues: {
        studentId: existing.studentId,
        courseId: existing.courseId,
        date: existing.date.toISOString().slice(0, 10),
        status: existing.status,
      },
      ipAddress,
    });

    return { success: true };
  }

  async bulkCreate(
    institutionId: string,
    dto: CreateAttendanceBulkDto,
    userId: string,
    ipAddress?: string,
  ): Promise<{ created: number; skipped: number; total: number }> {
    const role = await this.authorizationService.getUserRole(userId, institutionId);
    if (!role) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const access = await this.authorizationService.canCreate(
      userId,
      institutionId,
      // Any student in the course will be validated below; the course-level
      // authorization is what defines bulk access.
      dto.records[0]?.studentId ?? '',
      dto.courseId,
      dto.academicPeriodId,
      role,
    );
    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      if (access.reason === 'NO_COURSE_RELATIONSHIP' || access.reason === 'NO_STUDENT_RELATIONSHIP') {
        throw new NotFoundException('Student or course not found');
      }
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.validateCourseAndPeriod(institutionId, dto.courseId, dto.academicPeriodId);

    const result = await this.prisma.$transaction(async (tx) => {
      await this.assertPeriodOpen(tx, institutionId, dto.academicPeriodId);

      const studentIds = [...new Set(dto.records.map((r) => r.studentId))];

      const enrollments = await tx.enrollment.findMany({
        where: {
          institutionId,
          courseId: dto.courseId,
          academicPeriodId: dto.academicPeriodId,
          status: 'ACTIVE',
          studentId: { in: studentIds },
        },
        select: { studentId: true },
      });
      const enrolledIds = new Set(enrollments.map((e) => e.studentId));

      for (const sid of studentIds) {
        if (!enrolledIds.has(sid)) {
          throw new NotFoundException(
            `Student ${sid} is not enrolled in this course for the academic period`,
          );
        }
      }

      const date = this.toDateOnly(dto.date);

      // Filter records that already exist for this student/course/date (idempotent).
      const existing = await tx.attendance.findMany({
        where: {
          institutionId,
          courseId: dto.courseId,
          date,
          studentId: { in: studentIds },
        },
        select: { studentId: true },
      });
      const existingIds = new Set(existing.map((e) => e.studentId));

      const payload = dto.records
        .filter((r) => !existingIds.has(r.studentId))
        .map((r) => ({
          institutionId,
          studentId: r.studentId,
          courseId: dto.courseId,
          academicPeriodId: dto.academicPeriodId,
          date,
          status: r.status,
          notes: r.notes ?? null,
          recordedById: userId,
        }));

      if (payload.length > 0) {
        await tx.attendance.createMany({
          data: payload,
          skipDuplicates: true,
        });
      }

      const created = payload.length;
      const skipped = dto.records.length - created;

      if (created > 0) {
        await this.auditService.log({
          userId,
          institutionId,
          action: 'ATTENDANCE_BULK_CREATED',
          entityType: 'Attendance',
          newValues: {
            courseId: dto.courseId,
            academicPeriodId: dto.academicPeriodId,
            date: date.toISOString().slice(0, 10),
            created,
            skipped,
            studentIds: payload.map((p) => p.studentId),
          },
          ipAddress,
        });
      }

      return { created, skipped, total: dto.records.length };
    });

    return result;
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async validateIdentifiableResources(
    institutionId: string,
    studentId: string,
    courseId: string,
    academicPeriodId: string,
  ): Promise<void> {
    const [student, course, period] = await Promise.all([
      this.prisma.student.findFirst({ where: { id: studentId, institutionId, status: 'ACTIVE' } }),
      this.prisma.course.findFirst({ where: { id: courseId, institutionId } }),
      this.prisma.academicPeriod.findFirst({ where: { id: academicPeriodId, institutionId } }),
    ]);

    if (!student || !course || !period) {
      throw new NotFoundException('Student, course or academic period not found');
    }
  }

  private async validateCourseAndPeriod(
    institutionId: string,
    courseId: string,
    academicPeriodId: string,
  ): Promise<void> {
    const [course, period] = await Promise.all([
      this.prisma.course.findFirst({ where: { id: courseId, institutionId } }),
      this.prisma.academicPeriod.findFirst({ where: { id: academicPeriodId, institutionId } }),
    ]);

    if (!course || !period) {
      throw new NotFoundException('Course or academic period not found');
    }
  }

  private async assertPeriodOpen(
    tx: Prisma.TransactionClient,
    institutionId: string,
    academicPeriodId: string,
  ): Promise<void> {
    const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT id, status FROM academic_periods
      WHERE id = ${academicPeriodId}::uuid
        AND institution_id = ${institutionId}::uuid
      FOR UPDATE
    `;

    if (rows.length === 0) {
      throw new NotFoundException('Academic period not found');
    }

    if (rows[0].status === 'CLOSED') {
      throw new BadRequestException('Cannot modify attendance in a closed academic period');
    }
  }

  private toDateOnly(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private toDateRangeStart(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private toDateRangeEnd(value: string): Date {
    return new Date(`${value}T23:59:59.999Z`);
  }
}
