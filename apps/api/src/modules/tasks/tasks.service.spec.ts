import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TaskStatus } from '@prisma/client';

describe('TasksService', () => {
  let service: TasksService;
  let prismaMock: {
    course: { findFirst: jest.Mock };
    subject: { findFirst: jest.Mock };
    task: {
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
  const courseId = 'course-1';
  const subjectId = 'subject-1';
  const dueDate = '2026-09-15T23:59:00.000Z';

  beforeEach(() => {
    prismaMock = {
      course: { findFirst: jest.fn() },
      subject: { findFirst: jest.fn() },
      task: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    auditServiceMock = { log: jest.fn() };

    service = new TasksService(
      prismaMock as never,
      auditServiceMock as never,
    );

    prismaMock.course.findFirst.mockResolvedValue({ id: courseId, institutionId });
    prismaMock.subject.findFirst.mockResolvedValue({ id: subjectId, institutionId });
  });

  describe('create', () => {
    it('should create a task with tenant institutionId', async () => {
      prismaMock.task.create.mockResolvedValue({
        id: 'task-1',
        institutionId,
        courseId,
        subjectId,
        title: 'Test Task',
        description: 'Description',
        dueDate: new Date(dueDate),
        status: TaskStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        institutionId,
        { courseId, subjectId, title: 'Test Task', description: 'Description', dueDate },
        userId,
      );

      expect(result.institutionId).toBe(institutionId);
      expect(result.status).toBe(TaskStatus.DRAFT);
      expect(prismaMock.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institutionId, status: TaskStatus.DRAFT }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TASK_CREATED',
          institutionId,
          userId,
        }),
      );
    });

    it('should reject course from another tenant', async () => {
      prismaMock.course.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          institutionId,
          { courseId, subjectId, title: 'Test', dueDate },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject subject from another tenant', async () => {
      prismaMock.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          institutionId,
          { courseId, subjectId, title: 'Test', dueDate },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should assign DRAFT status by default', async () => {
      prismaMock.task.create.mockResolvedValue({
        id: 'task-1',
        institutionId,
        status: TaskStatus.DRAFT,
      });

      await service.create(
        institutionId,
        { courseId, subjectId, title: 'Test', dueDate },
        userId,
      );

      const createCall = prismaMock.task.create.mock.calls[0][0];
      expect(createCall.data.status).toBe(TaskStatus.DRAFT);
    });
  });

  describe('findOne', () => {
    it('should find task only in current tenant', async () => {
      prismaMock.task.findFirst.mockResolvedValue({
        id: 'task-1',
        institutionId,
      });

      const result = await service.findOne(institutionId, 'task-1');

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.task.findFirst).toHaveBeenCalledWith({
        where: { id: 'task-1', institutionId },
      });
    });

    it('should throw NotFoundException for cross-tenant resource', async () => {
      prismaMock.task.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(institutionId, 'task-from-other-tenant'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return only current tenant tasks', async () => {
      prismaMock.task.findMany.mockResolvedValue([
        { id: 't1', institutionId },
        { id: 't2', institutionId },
      ]);
      prismaMock.task.count.mockResolvedValue(2);

      const result = await service.findAll(institutionId, {});

      expect(result.data).toHaveLength(2);
      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
        }),
      );
    });

    it('should apply pagination', async () => {
      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, { page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by courseId within tenant', async () => {
      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      await service.findAll(institutionId, { courseId });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, courseId }),
        }),
      );
    });

    it('should filter by subjectId within tenant', async () => {
      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      await service.findAll(institutionId, { subjectId });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, subjectId }),
        }),
      );
    });

    it('should filter by status within tenant', async () => {
      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      await service.findAll(institutionId, { status: TaskStatus.PUBLISHED });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, status: TaskStatus.PUBLISHED }),
        }),
      );
    });

    it('should sort by dueDate ascending', async () => {
      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      await service.findAll(institutionId, {});

      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { dueDate: 'asc' } }),
      );
    });
  });

  describe('update', () => {
    it('should update DRAFT task only in current tenant', async () => {
      prismaMock.task.findFirst.mockResolvedValue({
        id: 'task-1',
        institutionId,
        courseId,
        subjectId,
        title: 'Old Title',
        dueDate: new Date(dueDate),
        status: TaskStatus.DRAFT,
      });
      prismaMock.task.update.mockResolvedValue({
        id: 'task-1',
        institutionId,
        title: 'New Title',
      });

      const result = await service.update(
        institutionId,
        'task-1',
        { title: 'New Title' },
        userId,
      );

      expect(result.title).toBe('New Title');
    });

    it('should throw NotFoundException for cross-tenant update', async () => {
      prismaMock.task.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'other-tenant-task', { title: 'X' }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not allow editing non-DRAFT tasks', async () => {
      prismaMock.task.findFirst.mockResolvedValue({
        id: 'task-1',
        institutionId,
        status: TaskStatus.PUBLISHED,
      });

      await expect(
        service.update(institutionId, 'task-1', { title: 'X' }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not allow modifying institutionId', async () => {
      prismaMock.task.findFirst.mockResolvedValue({
        id: 'task-1',
        institutionId,
        courseId,
        subjectId,
        title: 'Old',
        dueDate: new Date(dueDate),
        status: TaskStatus.DRAFT,
      });
      prismaMock.task.update.mockResolvedValue({ id: 'task-1', institutionId });

      await service.update(institutionId, 'task-1', { title: 'New' }, userId);

      const updateCall = prismaMock.task.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('institutionId');
    });

    it('should validate relations when courseId changes', async () => {
      prismaMock.task.findFirst.mockResolvedValue({
        id: 'task-1',
        institutionId,
        courseId,
        subjectId,
        title: 'Test',
        dueDate: new Date(dueDate),
        status: TaskStatus.DRAFT,
      });
      prismaMock.task.update.mockResolvedValue({ id: 'task-1', institutionId });

      await service.update(institutionId, 'task-1', { courseId: 'new-course' }, userId);

      expect(prismaMock.course.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'new-course', institutionId } }),
      );
    });
  });

  describe('publish', () => {
    it('should publish a DRAFT task', async () => {
      prismaMock.task.findFirst.mockResolvedValue({
        id: 'task-1',
        institutionId,
        status: TaskStatus.DRAFT,
      });
      prismaMock.task.update.mockResolvedValue({
        id: 'task-1',
        institutionId,
        status: TaskStatus.PUBLISHED,
      });

      const result = await service.publish(institutionId, 'task-1', userId);

      expect(result.status).toBe(TaskStatus.PUBLISHED);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TASK_PUBLISHED' }),
      );
    });

    it('should reject publishing non-DRAFT tasks', async () => {
      prismaMock.task.findFirst.mockResolvedValue({
        id: 'task-1',
        institutionId,
        status: TaskStatus.PUBLISHED,
      });

      await expect(
        service.publish(institutionId, 'task-1', userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('close', () => {
    it('should close a PUBLISHED task', async () => {
      prismaMock.task.findFirst.mockResolvedValue({
        id: 'task-1',
        institutionId,
        status: TaskStatus.PUBLISHED,
      });
      prismaMock.task.update.mockResolvedValue({
        id: 'task-1',
        institutionId,
        status: TaskStatus.CLOSED,
      });

      const result = await service.close(institutionId, 'task-1', userId);

      expect(result.status).toBe(TaskStatus.CLOSED);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TASK_CLOSED' }),
      );
    });

    it('should reject closing non-PUBLISHED tasks', async () => {
      prismaMock.task.findFirst.mockResolvedValue({
        id: 'task-1',
        institutionId,
        status: TaskStatus.DRAFT,
      });

      await expect(
        service.close(institutionId, 'task-1', userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivate', () => {
    it('should set status to INACTIVE', async () => {
      prismaMock.task.findFirst.mockResolvedValue({
        id: 'task-1',
        institutionId,
        status: TaskStatus.PUBLISHED,
      });
      prismaMock.task.update.mockResolvedValue({
        id: 'task-1',
        institutionId,
        status: TaskStatus.INACTIVE,
      });

      const result = await service.deactivate(institutionId, 'task-1', userId);

      expect(result.status).toBe(TaskStatus.INACTIVE);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TASK_DEACTIVATED',
        }),
      );
    });

    it('should throw NotFoundException for cross-tenant deactivate', async () => {
      prismaMock.task.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivate(institutionId, 'other-tenant-task', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
