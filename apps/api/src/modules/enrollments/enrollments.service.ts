import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { resolveAccessibleStudentIds, resolveAccessibleCourseIds } from '../../common/auth/academic-scope';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { ListEnrollmentsQueryDto } from './dto/list-enrollments-query.dto';
import { Enrollment, EnrollmentStatus, Prisma } from '@prisma/client';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateEnrollmentDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Enrollment> {
    const [student, course, schoolGrade, academicPeriod] = await Promise.all([
      this.prisma.student.findFirst({
        where: { id: dto.studentId, institutionId },
      }),
      this.prisma.course.findFirst({
        where: { id: dto.courseId, institutionId },
      }),
      this.prisma.schoolGrade.findFirst({
        where: { id: dto.schoolGradeId, institutionId },
      }),
      this.prisma.academicPeriod.findFirst({
        where: { id: dto.academicPeriodId, institutionId },
      }),
    ]);

    if (!student)
      throw new NotFoundException('Student not found in this institution');
    if (!course)
      throw new NotFoundException('Course not found in this institution');
    if (!schoolGrade)
      throw new NotFoundException('School grade not found in this institution');
    if (!academicPeriod)
      throw new NotFoundException('Academic period not found in this institution');

    const existing = await this.prisma.enrollment.findUnique({
      where: {
        institutionId_studentId_courseId_academicPeriodId: {
          institutionId,
          studentId: dto.studentId,
          courseId: dto.courseId,
          academicPeriodId: dto.academicPeriodId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Student is already enrolled in this course for this academic period',
      );
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        institutionId,
        studentId: dto.studentId,
        courseId: dto.courseId,
        schoolGradeId: dto.schoolGradeId,
        academicPeriodId: dto.academicPeriodId,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'ENROLLMENT_CREATED',
      entityType: 'Enrollment',
      entityId: enrollment.id,
      newValues: {
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        schoolGradeId: enrollment.schoolGradeId,
        academicPeriodId: enrollment.academicPeriodId,
        status: enrollment.status,
      },
      ipAddress,
    });

    return enrollment;
  }

  async findAll(
    institutionId: string,
    query: ListEnrollmentsQueryDto,
    userId?: string,
  ): Promise<{ data: Enrollment[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EnrollmentWhereInput = {
      institutionId,
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.schoolGradeId ? { schoolGradeId: query.schoolGradeId } : {}),
      ...(query.academicPeriodId
        ? { academicPeriodId: query.academicPeriodId }
        : {}),
    };

    if (userId) {
      const [accessibleStudents, accessibleCourses] = await Promise.all([
        resolveAccessibleStudentIds(this.prisma, institutionId, userId),
        resolveAccessibleCourseIds(this.prisma, institutionId, userId),
      ]);
      if (accessibleStudents !== null) {
        if (query.studentId && !accessibleStudents.includes(query.studentId)) {
          throw new NotFoundException('Enrollment not found');
        }
        where.studentId = query.studentId ?? { in: accessibleStudents };
      }
      if (accessibleCourses !== null) {
        if (query.courseId && !accessibleCourses.includes(query.courseId)) {
          throw new NotFoundException('Enrollment not found');
        }
        if (!query.courseId) {
          where.courseId = { in: accessibleCourses };
        }
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.enrollment.count({ where }),
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

  async findOne(institutionId: string, enrollmentId: string, userId?: string): Promise<Enrollment> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        institutionId,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (userId) {
      const accessible = await resolveAccessibleStudentIds(this.prisma, institutionId, userId);
      if (accessible !== null && !accessible.includes(enrollment.studentId)) {
        throw new NotFoundException('Enrollment not found');
      }
    }

    return enrollment;
  }

  async update(
    institutionId: string,
    enrollmentId: string,
    dto: UpdateEnrollmentDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Enrollment> {
    const existing = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        institutionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Enrollment not found');
    }

    const updateData: Prisma.EnrollmentUpdateInput = {};
    if (dto.status !== undefined) updateData.status = dto.status;

    const enrollment = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      institutionId,
      action:
        dto.status && dto.status === EnrollmentStatus.INACTIVE
          ? 'ENROLLMENT_DEACTIVATED'
          : 'ENROLLMENT_UPDATED',
      entityType: 'Enrollment',
      entityId: enrollment.id,
      oldValues: {
        status: existing.status,
      },
      newValues: {
        status: enrollment.status,
      },
      ipAddress,
    });

    return enrollment;
  }

  async deactivate(
    institutionId: string,
    enrollmentId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<Enrollment> {
    return this.update(
      institutionId,
      enrollmentId,
      { status: EnrollmentStatus.INACTIVE },
      userId,
      ipAddress,
    );
  }
}
