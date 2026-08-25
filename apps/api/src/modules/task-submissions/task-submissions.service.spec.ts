import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { TaskSubmissionsService } from './task-submissions.service';
import { TaskSubmissionStatus } from '@prisma/client';

describe('TaskSubmissionsService', () => {
  let service: TaskSubmissionsService;
  let prismaMock: {
    taskAssignment: { findFirst: jest.Mock };
    taskSubmission: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditServiceMock: { log: jest.Mock };

  const institutionId = 'inst-1';
  const userId = 'user-1';
  const taskAssignmentId = 'ta-1';

  beforeEach(() => {
    prismaMock = {
      taskAssignment: { findFirst: jest.fn() },
      taskSubmission: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    auditServiceMock = { log: jest.fn() };

    service = new TaskSubmissionsService(
      prismaMock as never,
      auditServiceMock as never,
    );
  });

  describe('create', () => {
    it('should create a submission for an assignment', async () => {
      const futureDue = new Date(Date.now() + 86400000);
      prismaMock.taskAssignment.findFirst.mockResolvedValue({
        id: taskAssignmentId,
        institutionId,
        studentId: 'student-1',
        task: { dueDate: futureDue },
      });
      prismaMock.taskSubmission.findUnique.mockResolvedValue(null);
      prismaMock.taskSubmission.create.mockResolvedValue({
        id: 'sub-1',
        institutionId,
        taskAssignmentId,
        status: TaskSubmissionStatus.SUBMITTED,
      });

      const result = await service.create(institutionId, taskAssignmentId, { content: 'My work' }, userId);

      expect(result.status).toBe(TaskSubmissionStatus.SUBMITTED);
    });

    it('should throw if assignment not found', async () => {
      prismaMock.taskAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.create(institutionId, taskAssignmentId, {}, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if submission already exists', async () => {
      prismaMock.taskAssignment.findFirst.mockResolvedValue({
        id: taskAssignmentId,
        institutionId,
        studentId: 'student-1',
        task: { dueDate: new Date(Date.now() + 86400000) },
      });
      prismaMock.taskSubmission.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(institutionId, taskAssignmentId, {}, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('should mark as LATE if past due date', async () => {
      const pastDue = new Date(Date.now() - 86400000);
      prismaMock.taskAssignment.findFirst.mockResolvedValue({
        id: taskAssignmentId,
        institutionId,
        studentId: 'student-1',
        task: { dueDate: pastDue },
      });
      prismaMock.taskSubmission.findUnique.mockResolvedValue(null);
      prismaMock.taskSubmission.create.mockResolvedValue({
        id: 'sub-1',
        status: TaskSubmissionStatus.LATE,
      });

      const result = await service.create(institutionId, taskAssignmentId, {}, userId);
      expect(result.status).toBe(TaskSubmissionStatus.LATE);
    });
  });

  describe('grade', () => {
    it('should grade a submission', async () => {
      prismaMock.taskSubmission.findFirst.mockResolvedValue({
        id: 'sub-1',
        institutionId,
        status: TaskSubmissionStatus.SUBMITTED,
        taskAssignment: { task: { dueDate: new Date() } },
      });
      prismaMock.taskSubmission.update.mockResolvedValue({
        id: 'sub-1',
        status: TaskSubmissionStatus.GRADED,
        grade: 85,
      });

      const result = await service.grade(institutionId, 'sub-1', { grade: '85', feedback: 'Good' }, userId);
      expect(result.status).toBe(TaskSubmissionStatus.GRADED);
    });

    it('should reject grading already graded submission', async () => {
      prismaMock.taskSubmission.findFirst.mockResolvedValue({
        id: 'sub-1',
        institutionId,
        status: TaskSubmissionStatus.GRADED,
        taskAssignment: { task: { dueDate: new Date() } },
      });

      await expect(
        service.grade(institutionId, 'sub-1', { grade: '85' }, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
