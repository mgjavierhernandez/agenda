import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateTeacherAssignmentDto } from './dto/create-teacher-assignment.dto';
import { UpdateTeacherAssignmentDto } from './dto/update-teacher-assignment.dto';
import { ListTeacherAssignmentsQueryDto } from './dto/list-teacher-assignments-query.dto';
import { TeacherAssignment, TeacherAssignmentStatus, Prisma } from '@prisma/client';

@Injectable()
export class TeacherAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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

    const assignment = await this.prisma.teacherAssignment.create({
      data: {
        institutionId,
        teacherUserId: dto.teacherUserId,
        courseId: dto.courseId,
        subjectId: dto.subjectId,
        academicPeriodId: dto.academicPeriodId,
      },
    });

    await this.auditService.log({
      action: 'TEACHER_ASSIGNMENT_CREATED',
      entityType: 'TeacherAssignment',
      entityId: assignment.id,
      institutionId,
      userId,
      newValues: { teacherUserId: dto.teacherUserId, courseId: dto.courseId, subjectId: dto.subjectId, academicPeriodId: dto.academicPeriodId },
      ipAddress: ip,
    });

    return assignment;
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

  async findOne(institutionId: string, id: string): Promise<TeacherAssignment> {
    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: { id, institutionId },
    });
    if (!assignment) throw new NotFoundException('Teacher assignment not found');
    return assignment;
  }

  async update(
    institutionId: string,
    id: string,
    dto: UpdateTeacherAssignmentDto,
    userId: string,
    ip?: string,
  ): Promise<TeacherAssignment> {
    const existing = await this.findOne(institutionId, id);

    const assignment = await this.prisma.teacherAssignment.update({
      where: { id: existing.id },
      data: { ...(dto.status !== undefined && { status: dto.status }) },
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
}
