import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TaskAssignmentsService } from './task-assignments.service';
import { TaskAssignmentStatus, TaskStatus } from '@prisma/client';
import { resolveAccessibleStudentIds } from '../../common/auth/academic-scope';

jest.mock('../../common/auth/academic-scope', () => ({
  resolveAccessibleStudentIds: jest.fn(),
  resolveAccessibleCourseIds: jest.fn(),
  getUserRoleNames: jest.fn(),
  hasFullAccess: jest.fn(),
  FULL_ACCESS_ROLES: new Set(),
  TEACHER_SCOPED_ROLES: new Set(),
}));

const mockedResolveStudents = jest.mocked(resolveAccessibleStudentIds);

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
    guardianStudent: { findMany: jest.Mock };
    userInstitution: { findFirst: jest.Mock };
    notification: { create: jest.Mock };
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
      guardianStudent: { findMany: jest.fn().mockResolvedValue([]) },
      userInstitution: { findFirst: jest.fn().mockResolvedValue(null) },
      notification: { create: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)),
    };

    auditServiceMock = { log: jest.fn() };

    service = new TaskAssignmentsService(
      prismaMock as never,
      auditServiceMock as never,
    );

    mockedResolveStudents.mockReset();
    mockedResolveStudents.mockResolvedValue(null);
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

    it('should reject an assignment outside the caller scope', async () => {
      mockedResolveStudents.mockResolvedValue(['own-1']);
      prismaMock.taskAssignment.findFirst.mockResolvedValue({ id: 'ta-1', institutionId, studentId: 'other-1' });

      await expect(service.findOne(institutionId, 'ta-1', 'student-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markOpened', () => {
    it('should audit TASK_OPENED for an accessible assignment', async () => {
      mockedResolveStudents.mockResolvedValue(['student-1']);
      prismaMock.taskAssignment.findFirst.mockResolvedValue({
        id: 'ta-1',
        institutionId,
        studentId,
        taskId,
      });

      const result = await service.markOpened(institutionId, 'ta-1', userId);

      expect(result.opened).toBe(true);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TASK_OPENED', entityId: 'ta-1', userId }),
      );
    });

    it('should not audit when out of scope', async () => {
      mockedResolveStudents.mockResolvedValue(['own-1']);
      prismaMock.taskAssignment.findFirst.mockResolvedValue({
        id: 'ta-1',
        institutionId,
        studentId: 'other-1',
        taskId,
      });

      await expect(service.markOpened(institutionId, 'ta-1', userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(auditServiceMock.log).not.toHaveBeenCalled();
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
