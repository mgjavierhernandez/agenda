import { NotFoundException, ConflictException } from '@nestjs/common';
import { SchoolGradesService } from './school-grades.service';
import { SchoolGradeStatus } from '@prisma/client';

describe('SchoolGradesService', () => {
  let service: SchoolGradesService;
  let prismaMock: {
    schoolGrade: {
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
      schoolGrade: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    auditServiceMock = { log: jest.fn() };

    service = new SchoolGradesService(
      prismaMock as never,
      auditServiceMock as never,
    );
  });

  describe('create', () => {
    it('should create a school grade with tenant institutionId', async () => {
      prismaMock.schoolGrade.findUnique.mockResolvedValue(null);
      prismaMock.schoolGrade.create.mockResolvedValue({
        id: 'grade-1',
        institutionId,
        name: '1st Grade',
        code: '1RA',
        sortOrder: 0,
        status: SchoolGradeStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        institutionId,
        {
          name: '1st Grade',
          code: '1RA',
        },
        userId,
      );

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.schoolGrade.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institutionId }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SCHOOL_GRADE_CREATED',
          institutionId,
          userId,
        }),
      );
    });

    it('should reject duplicate code within same tenant', async () => {
      prismaMock.schoolGrade.findUnique.mockResolvedValue({
        id: 'existing',
        institutionId,
      });

      await expect(
        service.create(
          institutionId,
          {
            name: '1st Grade',
            code: '1RA',
          },
          userId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow same code in different tenant', async () => {
      prismaMock.schoolGrade.findUnique.mockResolvedValue(null);
      prismaMock.schoolGrade.create.mockResolvedValue({
        id: 'grade-2',
        institutionId: 'inst-2',
        name: '1st Grade',
        code: '1RA',
        sortOrder: 0,
        status: SchoolGradeStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        'inst-2',
        {
          name: '1st Grade',
          code: '1RA',
        },
        userId,
      );

      expect(result.institutionId).toBe('inst-2');
    });
  });

  describe('findOne', () => {
    it('should find school grade only in current tenant', async () => {
      prismaMock.schoolGrade.findFirst.mockResolvedValue({
        id: 'grade-1',
        institutionId,
      });

      const result = await service.findOne(institutionId, 'grade-1');

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.schoolGrade.findFirst).toHaveBeenCalledWith({
        where: { id: 'grade-1', institutionId },
      });
    });

    it('should throw NotFoundException for cross-tenant resource', async () => {
      prismaMock.schoolGrade.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(institutionId, 'grade-from-other-tenant'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return only current tenant school grades', async () => {
      prismaMock.schoolGrade.findMany.mockResolvedValue([
        { id: 'g1', institutionId },
        { id: 'g2', institutionId },
      ]);
      prismaMock.schoolGrade.count.mockResolvedValue(2);

      const result = await service.findAll(institutionId, {});

      expect(result.data).toHaveLength(2);
      expect(prismaMock.schoolGrade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
        }),
      );
    });

    it('should apply pagination', async () => {
      prismaMock.schoolGrade.findMany.mockResolvedValue([]);
      prismaMock.schoolGrade.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, { page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(prismaMock.schoolGrade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by search term within tenant', async () => {
      prismaMock.schoolGrade.findMany.mockResolvedValue([]);
      prismaMock.schoolGrade.count.mockResolvedValue(0);

      await service.findAll(institutionId, { search: '1st' });

      expect(prismaMock.schoolGrade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institutionId,
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update school grade only in current tenant', async () => {
      prismaMock.schoolGrade.findFirst.mockResolvedValue({
        id: 'grade-1',
        institutionId,
        name: '1st Grade',
        code: '1RA',
        sortOrder: 0,
        status: SchoolGradeStatus.ACTIVE,
      });
      prismaMock.schoolGrade.update.mockResolvedValue({
        id: 'grade-1',
        institutionId,
        name: 'Updated Grade',
      });

      const result = await service.update(
        institutionId,
        'grade-1',
        { name: 'Updated Grade' },
        userId,
      );

      expect(result.name).toBe('Updated Grade');
    });

    it('should throw NotFoundException for cross-tenant update', async () => {
      prismaMock.schoolGrade.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'other-tenant-grade', { name: 'X' }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject duplicate code within same tenant on update', async () => {
      prismaMock.schoolGrade.findFirst
        .mockResolvedValueOnce({
          id: 'grade-1',
          institutionId,
          name: '1st Grade',
          code: '1RA',
        })
        .mockResolvedValueOnce({
          id: 'grade-2',
          institutionId,
        });

      await expect(
        service.update(
          institutionId,
          'grade-1',
          { code: '2DA' },
          userId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('should set status to INACTIVE', async () => {
      prismaMock.schoolGrade.findFirst.mockResolvedValue({
        id: 'grade-1',
        institutionId,
        name: '1st Grade',
        code: '1RA',
        sortOrder: 0,
        status: SchoolGradeStatus.ACTIVE,
      });
      prismaMock.schoolGrade.update.mockResolvedValue({
        id: 'grade-1',
        institutionId,
        status: SchoolGradeStatus.INACTIVE,
      });

      const result = await service.deactivate(institutionId, 'grade-1', userId);

      expect(result.status).toBe(SchoolGradeStatus.INACTIVE);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SCHOOL_GRADE_DEACTIVATED',
        }),
      );
    });
  });
});
