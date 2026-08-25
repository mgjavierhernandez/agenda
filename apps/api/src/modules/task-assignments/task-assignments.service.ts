import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateTaskAssignmentDto, UpdateTaskAssignmentDto, ListTaskAssignmentsQueryDto } from './dto/task-assignment.dto';
import { TaskAssignment, Prisma, TaskAssignmentStatus } from '@prisma/client';

@Injectable()
export class TaskAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateTaskAssignmentDto,
    userId: string,
    ipAddress?: string,
  ): Promise<TaskAssignment[]> {
    const task = await this.prisma.task.findFirst({
      where: { id: dto.taskId, institutionId },
    });
    if (!task) throw new NotFoundException('Task not found in this institution');
    if (task.status !== 'PUBLISHED') throw new BadRequestException('Task must be PUBLISHED to assign');

    let studentIds = dto.studentIds;
    if (!studentIds || studentIds.length === 0) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { institutionId, courseId: task.courseId, status: 'ACTIVE' },
      });
      studentIds = enrollments.map((e) => e.studentId);
    }

    if (studentIds.length === 0) throw new BadRequestException('No students to assign');

    const results: TaskAssignment[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const studentId of studentIds) {
        const student = await tx.student.findFirst({
          where: { id: studentId, institutionId },
        });
        if (!student) continue;

        const existing = await tx.taskAssignment.findUnique({
          where: { taskId_studentId: { taskId: dto.taskId, studentId } },
        });
        if (existing) continue;

        const enrollment = await tx.enrollment.findFirst({
          where: {
            institutionId,
            studentId,
            courseId: task.courseId,
            status: 'ACTIVE',
          },
        });

        const assignment = await tx.taskAssignment.create({
          data: {
            institutionId,
            taskId: dto.taskId,
            studentId,
            enrollmentId: enrollment?.id,
          },
        });
        results.push(assignment);
      }
    });

    if (results.length > 0) {
      await this.auditService.log({
        userId,
        institutionId,
        action: 'TASK_ASSIGNED',
        entityType: 'TaskAssignment',
        entityId: dto.taskId,
        newValues: { count: results.length, studentIds },
        ipAddress,
      });
    }

    return results;
  }

  async findAll(
    institutionId: string,
    query: ListTaskAssignmentsQueryDto,
  ): Promise<{ data: TaskAssignment[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskAssignmentWhereInput = {
      institutionId,
      ...(query.taskId ? { taskId: query.taskId } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.taskAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { assignedAt: 'desc' },
      }),
      this.prisma.taskAssignment.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(institutionId: string, id: string): Promise<TaskAssignment> {
    const assignment = await this.prisma.taskAssignment.findFirst({
      where: { id, institutionId },
    });
    if (!assignment) throw new NotFoundException('Task assignment not found');
    return assignment;
  }

  async update(
    institutionId: string,
    id: string,
    dto: UpdateTaskAssignmentDto,
    userId: string,
    ipAddress?: string,
  ): Promise<TaskAssignment> {
    const existing = await this.findOne(institutionId, id);

    const assignment = await this.prisma.taskAssignment.update({
      where: { id: existing.id },
      data: { ...(dto.status !== undefined && { status: dto.status }) },
    });

    await this.auditService.log({
      action: 'TASK_ASSIGNMENT_UPDATED',
      entityType: 'TaskAssignment',
      entityId: assignment.id,
      institutionId,
      userId,
      newValues: { changes: dto },
      ipAddress,
    });

    return assignment;
  }

  async deactivate(
    institutionId: string,
    id: string,
    userId: string,
    ipAddress?: string,
  ): Promise<TaskAssignment> {
    return this.update(institutionId, id, { status: TaskAssignmentStatus.CANCELLED }, userId, ipAddress);
  }
}
