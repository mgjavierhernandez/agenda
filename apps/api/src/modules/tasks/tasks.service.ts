import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { resolveAccessibleStudentIds, resolveAccessibleCourseIds, getUserRoleNames, TEACHER_SCOPED_ROLES } from '../../common/auth/academic-scope';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { Task, TaskStatus, Prisma } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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

  private async validateTeacherAuthorization(
    institutionId: string,
    userId: string,
    courseId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const membership = await this.prisma.userInstitution.findFirst({
      where: { userId, institutionId },
    });
    if (!membership) throw new ForbiddenException('Not a member of this institution');

    const hasTeacherRole = await this.prisma.userRole.findFirst({
      where: {
        userInstitutionId: membership.id,
        role: { name: 'TEACHER' },
      },
    });

    if (hasTeacherRole) {
      const teacherAssignment = await this.prisma.teacherAssignment.findFirst({
        where: {
          institutionId,
          teacherUserId: userId,
          courseId,
          status: 'ACTIVE',
        },
      });
      if (!teacherAssignment) {
        throw new ForbiddenException('Teacher is not assigned to this course');
      }
    }
  }

  async create(
    institutionId: string,
    dto: CreateTaskDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Task> {
    await this.validateRelations(institutionId, dto.courseId, dto.subjectId);

    const task = await this.prisma.task.create({
      data: {
        institutionId,
        courseId: dto.courseId,
        subjectId: dto.subjectId,
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        status: TaskStatus.DRAFT,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'TASK_CREATED',
      entityType: 'Task',
      entityId: task.id,
      newValues: {
        title: task.title,
        courseId: task.courseId,
        subjectId: task.subjectId,
        dueDate: String(task.dueDate),
        status: task.status,
      },
      ipAddress,
    });

    return task;
  }

  async findAll(
    institutionId: string,
    query: ListTasksQueryDto,
    userId?: string,
  ): Promise<{ data: Task[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      institutionId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.dueDateFrom || query.dueDateTo
        ? {
            dueDate: {
              ...(query.dueDateFrom ? { gte: new Date(query.dueDateFrom) } : {}),
              ...(query.dueDateTo ? { lte: new Date(query.dueDateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (userId) {
      const [accessibleStudents, accessibleCourses] = await Promise.all([
        resolveAccessibleStudentIds(this.prisma, institutionId, userId),
        resolveAccessibleCourseIds(this.prisma, institutionId, userId),
      ]);
      if (accessibleStudents !== null || accessibleCourses !== null) {
        if (query.courseId && accessibleCourses !== null && !accessibleCourses.includes(query.courseId)) {
          throw new NotFoundException('Task not found');
        }
        if (query.studentId && accessibleStudents !== null && !accessibleStudents.includes(query.studentId)) {
          throw new NotFoundException('Task not found');
        }
        // Estudiante explícito: restringir el alcance a ese estudiante.
        const effectiveStudents =
          query.studentId && accessibleStudents !== null ? [query.studentId] : accessibleStudents;
        const scopeOr: Prisma.TaskWhereInput[] = [];
        let hasScopeContent = false;
        if (effectiveStudents !== null) {
          const links = effectiveStudents.length > 0
            ? await this.prisma.taskAssignment.findMany({
                where: {
                  institutionId,
                  studentId: { in: effectiveStudents },
                  status: { not: 'CANCELLED' },
                },
                select: { taskId: true },
              })
            : [];
          const taskIds = [...new Set(links.map((l) => l.taskId))];
          if (taskIds.length > 0) hasScopeContent = true;
          scopeOr.push({ id: { in: taskIds } });
        }
        // Docentes: además ven las tareas de sus cursos asignados (aunque aún
        // no tengan entregas/asignaciones individuales creadas).
        if (!query.studentId && accessibleCourses !== null && accessibleCourses.length > 0) {
          const roleNames = await getUserRoleNames(this.prisma, institutionId, userId);
          if (roleNames.some((n) => TEACHER_SCOPED_ROLES.has(n))) {
            scopeOr.push({ courseId: { in: accessibleCourses } });
            hasScopeContent = true;
          }
        }
        if (!hasScopeContent) {
          return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
        }
        where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { OR: scopeOr }];
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.task.count({ where }),
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

  async findOne(institutionId: string, taskId: string, userId?: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        institutionId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (userId) {
      await this.assertTaskVisible(institutionId, task, userId);
    }

    return task;
  }

  /**
   * Verifica que el actor puede ver la tarea: asignación a un estudiante de su
   * alcance, o (docentes) curso asignado.
   */
  private async assertTaskVisible(
    institutionId: string,
    task: { id: string; courseId: string },
    userId: string,
  ): Promise<void> {
    const [accessibleStudents, accessibleCourses] = await Promise.all([
      resolveAccessibleStudentIds(this.prisma, institutionId, userId),
      resolveAccessibleCourseIds(this.prisma, institutionId, userId),
    ]);
    if (accessibleStudents === null && accessibleCourses === null) return;

    if (accessibleStudents !== null && accessibleStudents.length > 0) {
      const link = await this.prisma.taskAssignment.findFirst({
        where: { institutionId, taskId: task.id, studentId: { in: accessibleStudents } },
        select: { id: true },
      });
      if (link) return;
    }
    if (accessibleCourses !== null && accessibleCourses.includes(task.courseId)) {
      const roleNames = await getUserRoleNames(this.prisma, institutionId, userId);
      if (roleNames.some((n) => TEACHER_SCOPED_ROLES.has(n))) return;
    }
    throw new NotFoundException('Task not found');
  }

  async update(
    institutionId: string,
    taskId: string,
    dto: UpdateTaskDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Task> {
    const existing = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        institutionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    if (existing.status !== TaskStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT tasks can be edited');
    }

    if (dto.courseId || dto.subjectId) {
      const courseId = dto.courseId ?? existing.courseId;
      const subjectId = dto.subjectId ?? existing.subjectId;
      await this.validateRelations(institutionId, courseId, subjectId);
    }

    const updateData: Prisma.TaskUpdateInput = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.courseId !== undefined) updateData.course = { connect: { id: dto.courseId } };
    if (dto.subjectId !== undefined) updateData.subject = { connect: { id: dto.subjectId } };
    if (dto.dueDate !== undefined) updateData.dueDate = new Date(dto.dueDate);

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'TASK_UPDATED',
      entityType: 'Task',
      entityId: task.id,
      oldValues: {
        title: existing.title,
        courseId: existing.courseId,
        subjectId: existing.subjectId,
        dueDate: String(existing.dueDate),
        status: existing.status,
      },
      newValues: {
        title: task.title,
        courseId: task.courseId,
        subjectId: task.subjectId,
        dueDate: String(task.dueDate),
        status: task.status,
      },
      ipAddress,
    });

    return task;
  }

  async publish(
    institutionId: string,
    taskId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<Task> {
    const existing = await this.prisma.task.findFirst({
      where: { id: taskId, institutionId },
    });
    if (!existing) throw new NotFoundException('Task not found');

    if (existing.status !== TaskStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT tasks can be published');
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.PUBLISHED },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'TASK_PUBLISHED',
      entityType: 'Task',
      entityId: task.id,
      oldValues: { status: existing.status },
      newValues: { status: task.status },
      ipAddress,
    });

    return task;
  }

  async close(
    institutionId: string,
    taskId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<Task> {
    const existing = await this.prisma.task.findFirst({
      where: { id: taskId, institutionId },
    });
    if (!existing) throw new NotFoundException('Task not found');

    if (existing.status !== TaskStatus.PUBLISHED) {
      throw new BadRequestException('Only PUBLISHED tasks can be closed');
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.CLOSED },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'TASK_CLOSED',
      entityType: 'Task',
      entityId: task.id,
      oldValues: { status: existing.status },
      newValues: { status: task.status },
      ipAddress,
    });

    return task;
  }

  async deactivate(
    institutionId: string,
    taskId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<Task> {
    const existing = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        institutionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.INACTIVE },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'TASK_DEACTIVATED',
      entityType: 'Task',
      entityId: task.id,
      oldValues: { status: existing.status },
      newValues: { status: task.status },
      ipAddress,
    });

    return task;
  }
}
