import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { resolveParentContext, findGuardianUserIds } from '../../common/auth/parent-context';
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

    const grade = await this.prisma.grade.create({
      data: {
        institutionId,
        studentId: dto.studentId,
        courseId: dto.courseId,
        subjectId: dto.subjectId,
        value: dto.value,
        period: dto.period,
        evaluationType: dto.evaluationType,
        description: dto.description,
        status: dto.status,
      },
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
  ): Promise<{ data: Grade[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
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

    if (userId && !query.studentId) {
      const parentCtx = await resolveParentContext(this.prisma, institutionId, userId);
      if (parentCtx.isParent && parentCtx.studentIds.length > 0) {
        where.studentId = { in: parentCtx.studentIds };
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

  async findOne(institutionId: string, gradeId: string): Promise<Grade> {
    const grade = await this.prisma.grade.findFirst({
      where: {
        id: gradeId,
        institutionId,
      },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
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

    const updateData: Prisma.GradeUpdateInput = {};
    if (dto.studentId !== undefined) updateData.student = { connect: { id: dto.studentId } };
    if (dto.courseId !== undefined) updateData.course = { connect: { id: dto.courseId } };
    if (dto.subjectId !== undefined) updateData.subject = { connect: { id: dto.subjectId } };
    if (dto.value !== undefined) updateData.value = dto.value;
    if (dto.period !== undefined) updateData.period = dto.period;
    if (dto.evaluationType !== undefined) updateData.evaluationType = dto.evaluationType;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;

    const grade = await this.prisma.grade.update({
      where: { id: gradeId },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: dto.status && dto.status === GradeStatus.INACTIVE
        ? 'GRADE_DEACTIVATED'
        : 'GRADE_UPDATED',
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
    return this.update(
      institutionId,
      gradeId,
      { status: GradeStatus.INACTIVE },
      userId,
      ipAddress,
    );
  }
}
