import { NotFoundException } from '@nestjs/common';
import { GradesService } from './grades.service';
import { GradeStatus } from '@prisma/client';

describe('GradesService', () => {
  let service: GradesService;
  let prismaMock: {
    student: { findFirst: jest.Mock };
    course: { findFirst: jest.Mock };
    subject: { findFirst: jest.Mock };
    grade: {
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
  const studentId = 'student-1';
  const courseId = 'course-1';
  const subjectId = 'subject-1';

  beforeEach(() => {
    prismaMock = {
      student: { findFirst: jest.fn() },
      course: { findFirst: jest.fn() },
      subject: { findFirst: jest.fn() },
      grade: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    auditServiceMock = { log: jest.fn() };

    service = new GradesService(
      prismaMock as never,
      auditServiceMock as never,
    );

    prismaMock.student.findFirst.mockResolvedValue({ id: studentId, institutionId });
    prismaMock.course.findFirst.mockResolvedValue({ id: courseId, institutionId });
    prismaMock.subject.findFirst.mockResolvedValue({ id: subjectId, institutionId });
  });

  describe('create', () => {
    it('should create a grade with tenant institutionId', async () => {
      prismaMock.grade.create.mockResolvedValue({
        id: 'grade-1',
        institutionId,
        studentId,
        courseId,
        subjectId,
        value: 4.50,
        period: 'Q1-2026',
        evaluationType: 'Parcial',
        description: null,
        status: GradeStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        institutionId,
        { studentId, courseId, subjectId, value: 4.50, period: 'Q1-2026', evaluationType: 'Parcial' },
        userId,
      );

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.grade.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institutionId }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GRADE_CREATED',
          institutionId,
          userId,
        }),
      );
    });

    it('should reject student from another tenant', async () => {
      prismaMock.student.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          institutionId,
          { studentId, courseId, subjectId, value: 4.00, period: 'Q1-2026' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject course from another tenant', async () => {
      prismaMock.course.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          institutionId,
          { studentId, courseId, subjectId, value: 4.00, period: 'Q1-2026' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject subject from another tenant', async () => {
      prismaMock.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          institutionId,
          { studentId, courseId, subjectId, value: 4.00, period: 'Q1-2026' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should find grade only in current tenant', async () => {
      prismaMock.grade.findFirst.mockResolvedValue({
        id: 'grade-1',
        institutionId,
      });

      const result = await service.findOne(institutionId, 'grade-1');

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.grade.findFirst).toHaveBeenCalledWith({
        where: { id: 'grade-1', institutionId },
      });
    });

    it('should throw NotFoundException for cross-tenant resource', async () => {
      prismaMock.grade.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(institutionId, 'grade-from-other-tenant'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return only current tenant grades', async () => {
      prismaMock.grade.findMany.mockResolvedValue([
        { id: 'g1', institutionId },
        { id: 'g2', institutionId },
      ]);
      prismaMock.grade.count.mockResolvedValue(2);

      const result = await service.findAll(institutionId, {});

      expect(result.data).toHaveLength(2);
      expect(prismaMock.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
        }),
      );
    });

    it('should apply pagination', async () => {
      prismaMock.grade.findMany.mockResolvedValue([]);
      prismaMock.grade.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, { page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(prismaMock.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by studentId within tenant', async () => {
      prismaMock.grade.findMany.mockResolvedValue([]);
      prismaMock.grade.count.mockResolvedValue(0);

      await service.findAll(institutionId, { studentId });

      expect(prismaMock.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, studentId }),
        }),
      );
    });

    it('should filter by courseId within tenant', async () => {
      prismaMock.grade.findMany.mockResolvedValue([]);
      prismaMock.grade.count.mockResolvedValue(0);

      await service.findAll(institutionId, { courseId });

      expect(prismaMock.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, courseId }),
        }),
      );
    });

    it('should filter by subjectId within tenant', async () => {
      prismaMock.grade.findMany.mockResolvedValue([]);
      prismaMock.grade.count.mockResolvedValue(0);

      await service.findAll(institutionId, { subjectId });

      expect(prismaMock.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, subjectId }),
        }),
      );
    });

    it('should filter by period within tenant', async () => {
      prismaMock.grade.findMany.mockResolvedValue([]);
      prismaMock.grade.count.mockResolvedValue(0);

      await service.findAll(institutionId, { period: 'Q1-2026' });

      expect(prismaMock.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, period: expect.any(Object) }),
        }),
      );
    });

    it('should filter by status within tenant', async () => {
      prismaMock.grade.findMany.mockResolvedValue([]);
      prismaMock.grade.count.mockResolvedValue(0);

      await service.findAll(institutionId, { status: GradeStatus.ACTIVE });

      expect(prismaMock.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, status: GradeStatus.ACTIVE }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update grade only in current tenant', async () => {
      prismaMock.grade.findFirst.mockResolvedValue({
        id: 'grade-1',
        institutionId,
        studentId,
        courseId,
        subjectId,
        value: 4.00,
        period: 'Q1-2026',
        evaluationType: 'Parcial',
        status: GradeStatus.ACTIVE,
      });
      prismaMock.grade.update.mockResolvedValue({
        id: 'grade-1',
        institutionId,
        value: 4.50,
      });

      const result = await service.update(
        institutionId,
        'grade-1',
        { value: 4.50 },
        userId,
      );

      expect(result.value).toBe(4.50);
    });

    it('should throw NotFoundException for cross-tenant update', async () => {
      prismaMock.grade.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'other-tenant-grade', { value: 4.00 }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not allow modifying institutionId', async () => {
      prismaMock.grade.findFirst.mockResolvedValue({
        id: 'grade-1',
        institutionId,
        studentId,
        courseId,
        subjectId,
        value: 4.00,
        period: 'Q1-2026',
        status: GradeStatus.ACTIVE,
      });
      prismaMock.grade.update.mockResolvedValue({
        id: 'grade-1',
        institutionId,
      });

      await service.update(institutionId, 'grade-1', { value: 4.50 }, userId);

      const updateCall = prismaMock.grade.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('institutionId');
    });

    it('should validate relations when studentId changes', async () => {
      prismaMock.grade.findFirst.mockResolvedValue({
        id: 'grade-1',
        institutionId,
        studentId,
        courseId,
        subjectId,
        value: 4.00,
        period: 'Q1-2026',
        status: GradeStatus.ACTIVE,
      });
      prismaMock.grade.update.mockResolvedValue({
        id: 'grade-1',
        institutionId,
      });

      await service.update(institutionId, 'grade-1', { studentId: 'new-student' }, userId);

      expect(prismaMock.student.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'new-student', institutionId } }),
      );
    });

    it('should reject update with student from another tenant', async () => {
      prismaMock.grade.findFirst.mockResolvedValue({
        id: 'grade-1',
        institutionId,
        studentId,
        courseId,
        subjectId,
        value: 4.00,
        period: 'Q1-2026',
        status: GradeStatus.ACTIVE,
      });
      prismaMock.student.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'grade-1', { studentId: 'other-student' }, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should set status to INACTIVE', async () => {
      prismaMock.grade.findFirst.mockResolvedValue({
        id: 'grade-1',
        institutionId,
        studentId,
        courseId,
        subjectId,
        value: 4.00,
        period: 'Q1-2026',
        status: GradeStatus.ACTIVE,
      });
      prismaMock.grade.update.mockResolvedValue({
        id: 'grade-1',
        institutionId,
        status: GradeStatus.INACTIVE,
      });

      const result = await service.deactivate(institutionId, 'grade-1', userId);

      expect(result.status).toBe(GradeStatus.INACTIVE);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GRADE_DEACTIVATED',
        }),
      );
    });

    it('should throw NotFoundException for cross-tenant deactivate', async () => {
      prismaMock.grade.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivate(institutionId, 'other-tenant-grade', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
