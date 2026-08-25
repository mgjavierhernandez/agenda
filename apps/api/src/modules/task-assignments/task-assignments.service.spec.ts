import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TaskAssignmentsService } from './task-assignments.service';
import { TaskAssignmentStatus, TaskStatus } from '@prisma/client';

describe('TaskAssignmentsService', () => {
  let service: TaskAssignmentsService;
  let prismaMock: {
    task: { findFirst: jest.Mock };
    course: { findFirst: jest.Mock };
    student: { findFirst: jest.Mock };
    enrollment: { findFirst: jest.Mock; findMany: jest.Mock };
    taskAssignment: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let auditServiceMock: { log: jest.Mock };

  const institutionId = 'inst-1';
  const userId = 'user-1';
  const taskId = 'task-1';
  const studentId = 'student-1';
  const courseId = 'course-1';

  beforeEach(() => {
    prismaMock = {
      task: { findFirst: jest.fn() },
      course: { findFirst: jest.fn() },
      student: { findFirst: jest.fn() },
      enrollment: { findFirst: jest.fn(), findMany: jest.fn() },
      taskAssignment: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)),
    };

    auditServiceMock = { log: jest.fn() };

    service = new TaskAssignmentsService(
      prismaMock as never,
      auditServiceMock as never,
    );
  });

  describe('create', () => {
    it('should create assignment for specific students', async () => {
      prismaMock.task.findFirst.mockResolvedValue({ id: taskId, institutionId, courseId, status: TaskStatus.PUBLISHED });
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId, institutionId });
      prismaMock.taskAssignment.findUnique.mockResolvedValue(null);
      prismaMock.enrollment.findFirst.mockResolvedValue({ id: 'enr-1', studentId, courseId });
      prismaMock.taskAssignment.create.mockResolvedValue({ id: 'ta-1', institutionId, taskId, studentId });

      const result = await service.create(institutionId, { taskId, studentIds: [studentId] }, userId);

      expect(result).toHaveLength(1);
      expect(prismaMock.taskAssignment.create).toHaveBeenCalled();
    });

    it('should throw if task not found', async () => {
      prismaMock.task.findFirst.mockResolvedValue(null);

      await expect(
        service.create(institutionId, { taskId, studentIds: [studentId] }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if task is not PUBLISHED', async () => {
      prismaMock.task.findFirst.mockResolvedValue({ id: taskId, institutionId, status: TaskStatus.DRAFT });

      await expect(
        service.create(institutionId, { taskId, studentIds: [studentId] }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-assign all enrolled students when no studentIds', async () => {
      prismaMock.task.findFirst.mockResolvedValue({ id: taskId, institutionId, courseId, status: TaskStatus.PUBLISHED });
      prismaMock.enrollment.findMany.mockResolvedValue([{ studentId: 's1' }, { studentId: 's2' }]);
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId, institutionId });
      prismaMock.taskAssignment.findUnique.mockResolvedValue(null);
      prismaMock.enrollment.findFirst.mockResolvedValue({ id: 'enr-1' });
      prismaMock.taskAssignment.create.mockResolvedValue({ id: 'ta-1', institutionId, taskId, studentId });

      const result = await service.create(institutionId, { taskId }, userId);

      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should find assignment by id in tenant', async () => {
      prismaMock.taskAssignment.findFirst.mockResolvedValue({ id: 'ta-1', institutionId });

      const result = await service.findOne(institutionId, 'ta-1');
      expect(result.id).toBe('ta-1');
    });

    it('should throw NotFoundException if not found', async () => {
      prismaMock.taskAssignment.findFirst.mockResolvedValue(null);

      await expect(service.findOne(institutionId, 'ta-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update assignment status', async () => {
      prismaMock.taskAssignment.findFirst.mockResolvedValue({ id: 'ta-1', institutionId });
      prismaMock.taskAssignment.update.mockResolvedValue({ id: 'ta-1', status: TaskAssignmentStatus.COMPLETED });

      const result = await service.update(institutionId, 'ta-1', { status: TaskAssignmentStatus.COMPLETED }, userId);
      expect(result.status).toBe(TaskAssignmentStatus.COMPLETED);
    });
  });
});
