import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AcademicPeriodsService } from './academic-periods.service';
import { AcademicPeriodStatus } from '@prisma/client';

describe('AcademicPeriodsService', () => {
  let service: AcademicPeriodsService;
  let prismaMock: {
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
    academicPeriod: {
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
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          ...prismaMock,
        }),
      ),
      $queryRaw: jest.fn(),
      academicPeriod: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    auditServiceMock = { log: jest.fn() };

    service = new AcademicPeriodsService(prismaMock as never, auditServiceMock as never);
  });

  describe('create', () => {
    it('should create an academic period with tenant institutionId', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue(null);
      prismaMock.academicPeriod.create.mockResolvedValue({
        id: 'ap-1',
        institutionId,
        name: '2026-A',
        code: '2026A',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        status: AcademicPeriodStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        institutionId,
        {
          name: '2026-A',
          code: '2026A',
          startDate: '2026-01-01',
          endDate: '2026-06-30',
        },
        userId,
      );

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.academicPeriod.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institutionId }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACADEMIC_PERIOD_CREATED',
          institutionId,
          userId,
        }),
      );
    });

    it('should reject duplicate code within same tenant', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue({
        id: 'existing',
        institutionId,
      });

      await expect(
        service.create(
          institutionId,
          {
            name: '2026-A',
            code: '2026A',
            startDate: '2026-01-01',
            endDate: '2026-06-30',
          },
          userId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject startDate >= endDate', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          institutionId,
          {
            name: '2026-A',
            code: '2026A',
            startDate: '2026-06-30',
            endDate: '2026-01-01',
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow same code in different tenant', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue(null);
      prismaMock.academicPeriod.create.mockResolvedValue({
        id: 'ap-2',
        institutionId: 'inst-2',
        name: '2026-A',
        code: '2026A',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        status: AcademicPeriodStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        'inst-2',
        {
          name: '2026-A',
          code: '2026A',
          startDate: '2026-01-01',
          endDate: '2026-06-30',
        },
        userId,
      );

      expect(result.institutionId).toBe('inst-2');
    });
  });

  describe('findOne', () => {
    it('should find academic period only in current tenant', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue({
        id: 'ap-1',
        institutionId,
      });

      const result = await service.findOne(institutionId, 'ap-1');

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.academicPeriod.findFirst).toHaveBeenCalledWith({
        where: { id: 'ap-1', institutionId },
      });
    });

    it('should throw NotFoundException for cross-tenant resource', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue(null);

      await expect(service.findOne(institutionId, 'ap-from-other-tenant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return only current tenant academic periods', async () => {
      prismaMock.academicPeriod.findMany.mockResolvedValue([
        { id: 'ap1', institutionId },
        { id: 'ap2', institutionId },
      ]);
      prismaMock.academicPeriod.count.mockResolvedValue(2);

      const result = await service.findAll(institutionId, {});

      expect(result.data).toHaveLength(2);
      expect(prismaMock.academicPeriod.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
        }),
      );
    });

    it('should apply pagination', async () => {
      prismaMock.academicPeriod.findMany.mockResolvedValue([]);
      prismaMock.academicPeriod.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, { page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(prismaMock.academicPeriod.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by search term within tenant', async () => {
      prismaMock.academicPeriod.findMany.mockResolvedValue([]);
      prismaMock.academicPeriod.count.mockResolvedValue(0);

      await service.findAll(institutionId, { search: '2026' });

      expect(prismaMock.academicPeriod.findMany).toHaveBeenCalledWith(
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
    it('should update academic period only in current tenant', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue({
        id: 'ap-1',
        institutionId,
        name: '2026-A',
        code: '2026A',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        status: AcademicPeriodStatus.ACTIVE,
      });
      prismaMock.academicPeriod.update.mockResolvedValue({
        id: 'ap-1',
        institutionId,
        name: '2026-A Updated',
      });

      const result = await service.update(
        institutionId,
        'ap-1',
        { name: '2026-A Updated' },
        userId,
      );

      expect(result.name).toBe('2026-A Updated');
    });

    it('should throw NotFoundException for cross-tenant update', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'other-tenant-ap', { name: 'X' }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not allow modifying institutionId', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue({
        id: 'ap-1',
        institutionId,
        name: '2026-A',
        code: '2026A',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        status: AcademicPeriodStatus.ACTIVE,
      });
      prismaMock.academicPeriod.update.mockResolvedValue({
        id: 'ap-1',
        institutionId,
      });

      await service.update(institutionId, 'ap-1', { name: 'X' }, userId);

      const updateCall = prismaMock.academicPeriod.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('institutionId');
    });

    it('should reject duplicate code within same tenant on update', async () => {
      prismaMock.academicPeriod.findFirst
        .mockResolvedValueOnce({
          id: 'ap-1',
          institutionId,
          code: '2026A',
        })
        .mockResolvedValueOnce({
          id: 'ap-2',
          institutionId,
        });

      await expect(
        service.update(institutionId, 'ap-1', { code: '2026B' }, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject startDate >= endDate on update', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue({
        id: 'ap-1',
        institutionId,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
      });

      await expect(
        service.update(
          institutionId,
          'ap-1',
          { startDate: '2026-07-01', endDate: '2026-03-01' },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivate', () => {
    it('should set status to INACTIVE', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue({
        id: 'ap-1',
        institutionId,
        code: '2026A',
        status: AcademicPeriodStatus.ACTIVE,
      });
      prismaMock.academicPeriod.update.mockResolvedValue({
        id: 'ap-1',
        institutionId,
        status: AcademicPeriodStatus.INACTIVE,
      });

      const result = await service.deactivate(institutionId, 'ap-1', userId);

      expect(result.status).toBe(AcademicPeriodStatus.INACTIVE);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACADEMIC_PERIOD_DEACTIVATED',
        }),
      );
    });

    it('should reject deactivating a CLOSED period -> BadRequestException', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue({
        id: 'ap-1',
        institutionId,
        code: '2026A',
        status: AcademicPeriodStatus.CLOSED,
      });

      await expect(service.deactivate(institutionId, 'ap-1', userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('PROMPT 90: close academic period (OPEN -> CLOSED)', () => {
    it('should close an ACTIVE period and set authority fields server-side', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ id: 'ap-1', status: AcademicPeriodStatus.ACTIVE }]);
      prismaMock.academicPeriod.update.mockResolvedValue({
        id: 'ap-1',
        institutionId,
        name: '2026-A',
        code: '2026A',
        status: AcademicPeriodStatus.CLOSED,
        closedById: userId,
        closedAt: new Date('2026-08-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.close(institutionId, 'ap-1', userId);

      expect(result.status).toBe(AcademicPeriodStatus.CLOSED);
      expect(prismaMock.academicPeriod.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ap-1' },
          data: expect.objectContaining({
            status: AcademicPeriodStatus.CLOSED,
            closedById: userId,
            closedAt: expect.any(Date),
          }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACADEMIC_PERIOD_CLOSED',
          institutionId,
          userId,
        }),
      );
    });

    it('should reject closing an already CLOSED period -> BadRequestException', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ id: 'ap-1', status: AcademicPeriodStatus.CLOSED }]);

      await expect(service.close(institutionId, 'ap-1', userId)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.academicPeriod.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for cross-tenant/missing period', async () => {
      prismaMock.$queryRaw.mockResolvedValue([]);

      await expect(service.close(institutionId, 'other-tenant-ap', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PROMPT 90: CLOSED period mutation guards', () => {
    it('should reject editing a CLOSED period -> BadRequestException', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue({
        id: 'ap-1',
        institutionId,
        code: '2026A',
        status: AcademicPeriodStatus.CLOSED,
      });

      await expect(service.update(institutionId, 'ap-1', { name: 'X' }, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject setting status=CLOSED via the update endpoint -> BadRequestException', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue({
        id: 'ap-1',
        institutionId,
        code: '2026A',
        status: AcademicPeriodStatus.ACTIVE,
      });

      await expect(
        service.update(institutionId, 'ap-1', { status: AcademicPeriodStatus.CLOSED }, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PROMPT 90: create sets createdById server-side', () => {
    it('should set createdById to the acting user', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue(null);
      prismaMock.academicPeriod.create.mockResolvedValue({
        id: 'ap-1',
        institutionId,
        name: '2027-A',
        code: '2027A',
        startDate: new Date('2027-01-01'),
        endDate: new Date('2027-06-30'),
        status: AcademicPeriodStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create(
        institutionId,
        {
          name: '2027-A',
          code: '2027A',
          startDate: '2027-01-01',
          endDate: '2027-06-30',
        },
        userId,
      );

      expect(prismaMock.academicPeriod.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ createdById: userId }),
        }),
      );
    });
  });
});
