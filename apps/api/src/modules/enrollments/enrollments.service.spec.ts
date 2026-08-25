import { NotFoundException, ConflictException } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentStatus } from '@prisma/client';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let prismaMock: {
    student: { findFirst: jest.Mock };
    course: { findFirst: jest.Mock };
    schoolGrade: { findFirst: jest.Mock };
    academicPeriod: { findFirst: jest.Mock };
    enrollment: {
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

  beforeEach(() => {
    prismaMock = {
      student: { findFirst: jest.fn() },
      course: { findFirst: jest.fn() },
      schoolGrade: { findFirst: jest.fn() },
      academicPeriod: { findFirst: jest.fn() },
      enrollment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    auditServiceMock = { log: jest.fn() };

    service = new EnrollmentsService(
      prismaMock as never,
      auditServiceMock as never,
    );
  });

  describe('create', () => {
    it('should create an enrollment with tenant institutionId', async () => {
      prismaMock.student.findFirst.mockResolvedValue({ id: 's1', institutionId });
      prismaMock.course.findFirst.mockResolvedValue({ id: 'c1', institutionId });
      prismaMock.schoolGrade.findFirst.mockResolvedValue({ id: 'sg1', institutionId });
      prismaMock.academicPeriod.findFirst.mockResolvedValue({ id: 'ap1', institutionId });
      prismaMock.enrollment.findUnique.mockResolvedValue(null);
      prismaMock.enrollment.create.mockResolvedValue({
        id: 'enr-1',
        institutionId,
        studentId: 's1',
        courseId: 'c1',
        schoolGradeId: 'sg1',
        academicPeriodId: 'ap1',
        status: EnrollmentStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        institutionId,
        {
          studentId: 's1',
          courseId: 'c1',
          schoolGradeId: 'sg1',
          academicPeriodId: 'ap1',
        },
        userId,
      );

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.enrollment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institutionId }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ENROLLMENT_CREATED',
          institutionId,
          userId,
        }),
      );
    });

    it('should reject duplicate enrollment within same tenant', async () => {
      prismaMock.student.findFirst.mockResolvedValue({ id: 's1', institutionId });
      prismaMock.course.findFirst.mockResolvedValue({ id: 'c1', institutionId });
      prismaMock.schoolGrade.findFirst.mockResolvedValue({ id: 'sg1', institutionId });
      prismaMock.academicPeriod.findFirst.mockResolvedValue({ id: 'ap1', institutionId });
      prismaMock.enrollment.findUnique.mockResolvedValue({
        id: 'existing',
        institutionId,
      });

      await expect(
        service.create(
          institutionId,
          {
            studentId: 's1',
            courseId: 'c1',
            schoolGradeId: 'sg1',
            academicPeriodId: 'ap1',
          },
          userId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for student not found cross-tenant', async () => {
      prismaMock.student.findFirst.mockResolvedValue(null);
      prismaMock.course.findFirst.mockResolvedValue({ id: 'c1', institutionId });
      prismaMock.schoolGrade.findFirst.mockResolvedValue({ id: 'sg1', institutionId });
      prismaMock.academicPeriod.findFirst.mockResolvedValue({ id: 'ap1', institutionId });

      await expect(
        service.create(
          institutionId,
          {
            studentId: 'other-tenant-student',
            courseId: 'c1',
            schoolGradeId: 'sg1',
            academicPeriodId: 'ap1',
          },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for course not found', async () => {
      prismaMock.student.findFirst.mockResolvedValue({ id: 's1', institutionId });
      prismaMock.course.findFirst.mockResolvedValue(null);
      prismaMock.schoolGrade.findFirst.mockResolvedValue({ id: 'sg1', institutionId });
      prismaMock.academicPeriod.findFirst.mockResolvedValue({ id: 'ap1', institutionId });

      await expect(
        service.create(
          institutionId,
          {
            studentId: 's1',
            courseId: 'other-tenant-course',
            schoolGradeId: 'sg1',
            academicPeriodId: 'ap1',
          },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for schoolGrade not found', async () => {
      prismaMock.student.findFirst.mockResolvedValue({ id: 's1', institutionId });
      prismaMock.course.findFirst.mockResolvedValue({ id: 'c1', institutionId });
      prismaMock.schoolGrade.findFirst.mockResolvedValue(null);
      prismaMock.academicPeriod.findFirst.mockResolvedValue({ id: 'ap1', institutionId });

      await expect(
        service.create(
          institutionId,
          {
            studentId: 's1',
            courseId: 'c1',
            schoolGradeId: 'other-tenant-schoolGrade',
            academicPeriodId: 'ap1',
          },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for academicPeriod not found', async () => {
      prismaMock.student.findFirst.mockResolvedValue({ id: 's1', institutionId });
      prismaMock.course.findFirst.mockResolvedValue({ id: 'c1', institutionId });
      prismaMock.schoolGrade.findFirst.mockResolvedValue({ id: 'sg1', institutionId });
      prismaMock.academicPeriod.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          institutionId,
          {
            studentId: 's1',
            courseId: 'c1',
            schoolGradeId: 'sg1',
            academicPeriodId: 'other-tenant-academicPeriod',
          },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should find enrollment only in current tenant', async () => {
      prismaMock.enrollment.findFirst.mockResolvedValue({
        id: 'enr-1',
        institutionId,
      });

      const result = await service.findOne(institutionId, 'enr-1');

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.enrollment.findFirst).toHaveBeenCalledWith({
        where: { id: 'enr-1', institutionId },
      });
    });

    it('should throw NotFoundException for cross-tenant resource', async () => {
      prismaMock.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(institutionId, 'enrollment-from-other-tenant'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return only current tenant enrollments', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([
        { id: 'e1', institutionId },
        { id: 'e2', institutionId },
      ]);
      prismaMock.enrollment.count.mockResolvedValue(2);

      const result = await service.findAll(institutionId, {});

      expect(result.data).toHaveLength(2);
      expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
        }),
      );
    });

    it('should apply pagination', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([]);
      prismaMock.enrollment.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, { page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by studentId within tenant', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([]);
      prismaMock.enrollment.count.mockResolvedValue(0);

      await service.findAll(institutionId, { studentId: 's1' });

      expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institutionId,
            studentId: 's1',
          }),
        }),
      );
    });

    it('should filter by courseId within tenant', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([]);
      prismaMock.enrollment.count.mockResolvedValue(0);

      await service.findAll(institutionId, { courseId: 'c1' });

      expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institutionId,
            courseId: 'c1',
          }),
        }),
      );
    });

    it('should filter by schoolGradeId within tenant', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([]);
      prismaMock.enrollment.count.mockResolvedValue(0);

      await service.findAll(institutionId, { schoolGradeId: 'sg1' });

      expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institutionId,
            schoolGradeId: 'sg1',
          }),
        }),
      );
    });

    it('should filter by academicPeriodId within tenant', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([]);
      prismaMock.enrollment.count.mockResolvedValue(0);

      await service.findAll(institutionId, { academicPeriodId: 'ap1' });

      expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institutionId,
            academicPeriodId: 'ap1',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update enrollment only in current tenant', async () => {
      prismaMock.enrollment.findFirst.mockResolvedValue({
        id: 'enr-1',
        institutionId,
        status: EnrollmentStatus.ACTIVE,
      });
      prismaMock.enrollment.update.mockResolvedValue({
        id: 'enr-1',
        institutionId,
        status: EnrollmentStatus.INACTIVE,
      });

      const result = await service.update(
        institutionId,
        'enr-1',
        { status: EnrollmentStatus.INACTIVE },
        userId,
      );

      expect(result.status).toBe(EnrollmentStatus.INACTIVE);
    });

    it('should throw NotFoundException for cross-tenant update', async () => {
      prismaMock.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.update(
          institutionId,
          'other-tenant-enrollment',
          { status: EnrollmentStatus.INACTIVE },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should set status to INACTIVE', async () => {
      prismaMock.enrollment.findFirst.mockResolvedValue({
        id: 'enr-1',
        institutionId,
        status: EnrollmentStatus.ACTIVE,
      });
      prismaMock.enrollment.update.mockResolvedValue({
        id: 'enr-1',
        institutionId,
        status: EnrollmentStatus.INACTIVE,
      });

      const result = await service.deactivate(institutionId, 'enr-1', userId);

      expect(result.status).toBe(EnrollmentStatus.INACTIVE);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ENROLLMENT_DEACTIVATED',
        }),
      );
    });
  });
});
