import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { resolveAccessibleStudentIds } from '../../common/auth/academic-scope';
import { findGuardianUserIds } from '../../common/auth/parent-context';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { ListGradesQueryDto } from './dto/list-grades-query.dto';
import { Grade, GradeStatus, Prisma } from '@prisma/client';

@Injectable()
export class GradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Resolves a grade's period label against the tenant's academic periods.
   * Uses a row-level lock on the matching AcademicPeriod row so that grade
   * writes and period closure are mutually exclusive (no mutation slips in
   * after a period is closed). Returns the resolvable academicPeriodId, or
   * null when no matching academic period exists (legacy free-text period).
   */
  private async validateRelations(
    institutionId: string,
    studentId: string,
    courseId: string,
    subjectId: string,
  ): Promise<void> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, institutionId },
    });
    if (!student) {
      throw new NotFoundException('Student not found in this institution');
    }

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

  async create(
    institutionId: string,
    dto: CreateGradeDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Grade> {
    await this.validateRelations(institutionId, dto.studentId, dto.courseId, dto.subjectId);

    const grade = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
        SELECT id, status FROM academic_periods
        WHERE institution_id = ${institutionId}::uuid
          AND lower(code) = lower(${dto.period})
        LIMIT 1
        FOR UPDATE
      `;
      if (rows.length > 0 && rows[0].status === 'CLOSED') {
        throw new BadRequestException('Cannot create a grade in a closed academic period');
      }
      return tx.grade.create({
        data: {
          institutionId,
          studentId: dto.studentId,
          courseId: dto.courseId,
          subjectId: dto.subjectId,
          academicPeriodId: rows.length > 0 ? rows[0].id : null,
          value: dto.value,
          period: dto.period,
          evaluationType: dto.evaluationType,
          description: dto.description,
          status: dto.status,
        },
      });
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'GRADE_CREATED',
      entityType: 'Grade',
      entityId: grade.id,
      newValues: {
        studentId: grade.studentId,
        courseId: grade.courseId,
        subjectId: grade.subjectId,
        value: grade.value.toString(),
        period: grade.period,
        evaluationType: grade.evaluationType,
      },
      ipAddress,
    });

    const guardianIds = await findGuardianUserIds(this.prisma, institutionId, [grade.studentId]);
    for (const guardianId of guardianIds) {
      const membership = await this.prisma.userInstitution.findFirst({
        where: { userId: guardianId, institutionId, status: 'ACTIVE' },
      });
      if (membership) {
        await this.prisma.notification.create({
          data: {
            institutionId,
            userId: guardianId,
            type: 'GENERAL',
            title: 'Nueva calificacion registrada',
            message: `Se ha registrado una calificacion de ${grade.value} en el periodo ${grade.period}`,
            entityType: 'Grade',
            entityId: grade.id,
          },
        });
      }
    }

    return grade;
  }

  async findAll(
    institutionId: string,
    query: ListGradesQueryDto,
    userId?: string,
  ): Promise<{
    data: Grade[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.GradeWhereInput = {
      institutionId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.period ? { period: { contains: query.period, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { period: { contains: query.search, mode: 'insensitive' } },
              { evaluationType: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (userId) {
      const accessible = await resolveAccessibleStudentIds(this.prisma, institutionId, userId);
      if (accessible !== null) {
        if (query.studentId && !accessible.includes(query.studentId)) {
          throw new NotFoundException('Grade not found');
        }
        where.studentId = query.studentId ?? { in: accessible };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.grade.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.grade.count({ where }),
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

  async findOne(institutionId: string, gradeId: string, userId?: string): Promise<Grade> {
    const grade = await this.prisma.grade.findFirst({
      where: {
        id: gradeId,
        institutionId,
      },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    if (userId) {
      const accessible = await resolveAccessibleStudentIds(this.prisma, institutionId, userId);
      if (accessible !== null && !accessible.includes(grade.studentId)) {
        throw new NotFoundException('Grade not found');
      }
    }

    return grade;
  }

  async update(
    institutionId: string,
    gradeId: string,
    dto: UpdateGradeDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Grade> {
    const existing = await this.prisma.grade.findFirst({
      where: {
        id: gradeId,
        institutionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Grade not found');
    }

    if (dto.studentId || dto.courseId || dto.subjectId) {
      const studentId = dto.studentId ?? existing.studentId;
      const courseId = dto.courseId ?? existing.courseId;
      const subjectId = dto.subjectId ?? existing.subjectId;
      await this.validateRelations(institutionId, studentId, courseId, subjectId);
    }

    const grade = await this.prisma.$transaction(async (tx) => {
      const targetPeriodLabel = dto.period ?? existing.period;
      const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
        SELECT id, status FROM academic_periods
        WHERE institution_id = ${institutionId}::uuid
          AND lower(code) = lower(${targetPeriodLabel})
        LIMIT 1
        FOR UPDATE
      `;
      if (rows.length > 0 && rows[0].status === 'CLOSED') {
        throw new BadRequestException('Cannot modify a grade in a closed academic period');
      }

      const updateData: Prisma.GradeUpdateInput = {};
      if (dto.studentId !== undefined) updateData.student = { connect: { id: dto.studentId } };
      if (dto.courseId !== undefined) updateData.course = { connect: { id: dto.courseId } };
      if (dto.subjectId !== undefined) updateData.subject = { connect: { id: dto.subjectId } };
      if (dto.value !== undefined) updateData.value = dto.value;
      if (dto.period !== undefined) {
        updateData.period = dto.period;
        updateData.academicPeriod =
          rows.length > 0 ? { connect: { id: rows[0].id } } : { disconnect: true };
      }
      if (dto.evaluationType !== undefined) updateData.evaluationType = dto.evaluationType;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.status !== undefined) updateData.status = dto.status;

      return tx.grade.update({
        where: { id: gradeId },
        data: updateData,
      });
    });

    await this.auditService.log({
      userId,
      institutionId,
      action:
        dto.status && dto.status === GradeStatus.INACTIVE ? 'GRADE_DEACTIVATED' : 'GRADE_UPDATED',
      entityType: 'Grade',
      entityId: grade.id,
      oldValues: {
        studentId: existing.studentId,
        courseId: existing.courseId,
        subjectId: existing.subjectId,
        value: String(existing.value),
        period: existing.period,
        evaluationType: existing.evaluationType,
        status: existing.status,
      },
      newValues: {
        studentId: grade.studentId,
        courseId: grade.courseId,
        subjectId: grade.subjectId,
        value: String(grade.value),
        period: grade.period,
        evaluationType: grade.evaluationType,
        status: grade.status,
      },
      ipAddress,
    });

    return grade;
  }

  async deactivate(
    institutionId: string,
    gradeId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<Grade> {
    return this.update(institutionId, gradeId, { status: GradeStatus.INACTIVE }, userId, ipAddress);
  }
}
