import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateSubmissionDto, UpdateSubmissionDto, GradeSubmissionDto, ListSubmissionsQueryDto } from './dto/task-submission.dto';
import { TaskSubmission, TaskSubmissionStatus, Prisma } from '@prisma/client';

@Injectable()
export class TaskSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    institutionId: string,
    taskAssignmentId: string,
    dto: CreateSubmissionDto,
    currentUserId: string,
    ipAddress?: string,
  ): Promise<TaskSubmission> {
    const assignment = await this.prisma.taskAssignment.findFirst({
      where: { id: taskAssignmentId, institutionId },
      include: { task: true },
    });
    if (!assignment) throw new NotFoundException('Task assignment not found');

    const existing = await this.prisma.taskSubmission.findUnique({
      where: { taskAssignmentId },
    });
    if (existing) throw new ConflictException('Submission already exists for this assignment');

    const now = new Date();
    const isLate = assignment.task.dueDate < now;

    const submission = await this.prisma.taskSubmission.create({
      data: {
        institutionId,
        taskAssignmentId,
        studentId: assignment.studentId,
        status: isLate ? TaskSubmissionStatus.LATE : TaskSubmissionStatus.SUBMITTED,
        content: dto.content,
        submittedAt: now,
      },
    });

    await this.auditService.log({
      userId: currentUserId,
      institutionId,
      action: 'TASK_SUBMITTED',
      entityType: 'TaskSubmission',
      entityId: submission.id,
      newValues: { taskAssignmentId, status: submission.status },
      ipAddress,
    });

    return submission;
  }

  async findByAssignment(
    institutionId: string,
    taskAssignmentId: string,
  ): Promise<TaskSubmission> {
    const submission = await this.prisma.taskSubmission.findFirst({
      where: { taskAssignmentId, institutionId },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async findAll(
    institutionId: string,
    query: ListSubmissionsQueryDto,
  ): Promise<{ data: TaskSubmission[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskSubmissionWhereInput = {
      institutionId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.taskSubmission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.taskSubmission.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async update(
    institutionId: string,
    id: string,
    dto: UpdateSubmissionDto,
    currentUserId: string,
    ipAddress?: string,
  ): Promise<TaskSubmission> {
    const existing = await this.prisma.taskSubmission.findFirst({
      where: { id, institutionId },
    });
    if (!existing) throw new NotFoundException('Submission not found');

    if (existing.status === TaskSubmissionStatus.GRADED) {
      throw new BadRequestException('Cannot modify a graded submission');
    }

    const submission = await this.prisma.taskSubmission.update({
      where: { id: existing.id },
      data: {
        content: dto.content,
        status: TaskSubmissionStatus.SUBMITTED,
      },
    });

    await this.auditService.log({
      userId: currentUserId,
      institutionId,
      action: 'TASK_SUBMISSION_UPDATED',
      entityType: 'TaskSubmission',
      entityId: submission.id,
      oldValues: { content: existing.content },
      newValues: { content: submission.content },
      ipAddress,
    });

    return submission;
  }

  async grade(
    institutionId: string,
    id: string,
    dto: GradeSubmissionDto,
    currentUserId: string,
    ipAddress?: string,
  ): Promise<TaskSubmission> {
    const existing = await this.prisma.taskSubmission.findFirst({
      where: { id, institutionId },
      include: { taskAssignment: { include: { task: true } } },
    });
    if (!existing) throw new NotFoundException('Submission not found');

    if (existing.status === TaskSubmissionStatus.GRADED) {
      throw new BadRequestException('Submission already graded');
    }

    const submission = await this.prisma.taskSubmission.update({
      where: { id: existing.id },
      data: {
        grade: dto.grade,
        feedback: dto.feedback,
        status: TaskSubmissionStatus.GRADED,
        gradedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId: currentUserId,
      institutionId,
      action: 'TASK_GRADED',
      entityType: 'TaskSubmission',
      entityId: submission.id,
      oldValues: { grade: existing.grade?.toString() },
      newValues: { grade: dto.grade, feedback: dto.feedback },
      ipAddress,
    });

    return submission;
  }
}
