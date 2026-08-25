import { NotFoundException, ConflictException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CourseStatus } from '@prisma/client';

describe('CoursesService', () => {
  let service: CoursesService;
  let prismaMock: {
    course: {
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
      course: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    auditServiceMock = { log: jest.fn() };

    service = new CoursesService(
      prismaMock as never,
      auditServiceMock as never,
    );
  });

  describe('create', () => {
    it('should create a course with tenant institutionId', async () => {
      prismaMock.course.findUnique.mockResolvedValue(null);
      prismaMock.course.create.mockResolvedValue({
        id: 'course-1',
        institutionId,
        code: 'MAT-001',
        name: 'Matemáticas',
        description: 'Curso de matemáticas',
        status: CourseStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        institutionId,
        { code: 'MAT-001', name: 'Matemáticas', description: 'Curso de matemáticas' },
        userId,
      );

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institutionId }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'COURSE_CREATED',
          institutionId,
          userId,
        }),
      );
    });

    it('should reject duplicate code within same tenant', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        id: 'existing',
        institutionId,
      });

      await expect(
        service.create(
          institutionId,
          { code: 'MAT-001', name: 'Matemáticas' },
          userId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow same code in different tenant', async () => {
      prismaMock.course.findUnique.mockResolvedValue(null);
      prismaMock.course.create.mockResolvedValue({
        id: 'course-2',
        institutionId: 'inst-2',
        code: 'MAT-001',
        name: 'Matemáticas',
        status: CourseStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        'inst-2',
        { code: 'MAT-001', name: 'Matemáticas' },
        userId,
      );

      expect(result.institutionId).toBe('inst-2');
    });
  });

  describe('findOne', () => {
    it('should find course only in current tenant', async () => {
      prismaMock.course.findFirst.mockResolvedValue({
        id: 'course-1',
        institutionId,
      });

      const result = await service.findOne(institutionId, 'course-1');

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.course.findFirst).toHaveBeenCalledWith({
        where: { id: 'course-1', institutionId },
      });
    });

    it('should throw NotFoundException for cross-tenant resource', async () => {
      prismaMock.course.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(institutionId, 'course-from-other-tenant'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return only current tenant courses', async () => {
      prismaMock.course.findMany.mockResolvedValue([
        { id: 'c1', institutionId },
        { id: 'c2', institutionId },
      ]);
      prismaMock.course.count.mockResolvedValue(2);

      const result = await service.findAll(institutionId, {});

      expect(result.data).toHaveLength(2);
      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
        }),
      );
    });

    it('should apply pagination', async () => {
      prismaMock.course.findMany.mockResolvedValue([]);
      prismaMock.course.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, { page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by search term within tenant', async () => {
      prismaMock.course.findMany.mockResolvedValue([]);
      prismaMock.course.count.mockResolvedValue(0);

      await service.findAll(institutionId, { search: 'MAT' });

      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institutionId,
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should filter by status within tenant', async () => {
      prismaMock.course.findMany.mockResolvedValue([]);
      prismaMock.course.count.mockResolvedValue(0);

      await service.findAll(institutionId, { status: CourseStatus.ACTIVE });

      expect(prismaMock.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institutionId,
            status: CourseStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update course only in current tenant', async () => {
      prismaMock.course.findFirst.mockResolvedValue({
        id: 'course-1',
        institutionId,
        code: 'MAT-001',
        name: 'Matemáticas',
        description: null,
        status: CourseStatus.ACTIVE,
      });
      prismaMock.course.update.mockResolvedValue({
        id: 'course-1',
        institutionId,
        name: 'Matemáticas II',
      });

      const result = await service.update(
        institutionId,
        'course-1',
        { name: 'Matemáticas II' },
        userId,
      );

      expect(result.name).toBe('Matemáticas II');
    });

    it('should throw NotFoundException for cross-tenant update', async () => {
      prismaMock.course.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'other-tenant-course', { name: 'X' }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not allow modifying institutionId', async () => {
      prismaMock.course.findFirst.mockResolvedValue({
        id: 'course-1',
        institutionId,
        code: 'MAT-001',
        name: 'Matemáticas',
        status: CourseStatus.ACTIVE,
      });
      prismaMock.course.update.mockResolvedValue({
        id: 'course-1',
        institutionId,
      });

      await service.update(institutionId, 'course-1', { name: 'X' }, userId);

      const updateCall = prismaMock.course.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('institutionId');
    });

    it('should reject duplicate code within same tenant on update', async () => {
      prismaMock.course.findFirst
        .mockResolvedValueOnce({
          id: 'course-1',
          institutionId,
          code: 'MAT-001',
          name: 'Matemáticas',
          status: CourseStatus.ACTIVE,
        })
        .mockResolvedValueOnce({
          id: 'course-2',
          institutionId,
        });

      await expect(
        service.update(
          institutionId,
          'course-1',
          { code: 'CIE-001' },
          userId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('should set status to INACTIVE', async () => {
      prismaMock.course.findFirst.mockResolvedValue({
        id: 'course-1',
        institutionId,
        code: 'MAT-001',
        name: 'Matemáticas',
        status: CourseStatus.ACTIVE,
      });
      prismaMock.course.update.mockResolvedValue({
        id: 'course-1',
        institutionId,
        status: CourseStatus.INACTIVE,
      });

      const result = await service.deactivate(institutionId, 'course-1', userId);

      expect(result.status).toBe(CourseStatus.INACTIVE);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'COURSE_DEACTIVATED',
        }),
      );
    });
  });
});
