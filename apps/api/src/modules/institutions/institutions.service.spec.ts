import { NotFoundException, ConflictException } from '@nestjs/common';
import { InstitutionsService } from './institutions.service';
import { InstitutionStatus } from '@prisma/client';

describe('InstitutionsService', () => {
  let service: InstitutionsService;
  let prismaMock: {
    institution: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditServiceMock: { log: jest.Mock };

  beforeEach(() => {
    prismaMock = {
      institution: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    auditServiceMock = { log: jest.fn() };
    service = new InstitutionsService(prismaMock as never, auditServiceMock as never);
  });

  describe('create', () => {
    it('should create an institution', async () => {
      prismaMock.institution.findUnique.mockResolvedValue(null);
      prismaMock.institution.create.mockResolvedValue({
        id: 'inst-1', name: 'Test School', slug: 'test-school', status: InstitutionStatus.ACTIVE,
      });

      const result = await service.create({ name: 'Test School', slug: 'test-school' }, 'user-1');
      expect(result.name).toBe('Test School');
      expect(prismaMock.institution.create).toHaveBeenCalled();
    });

    it('should reject duplicate slug', async () => {
      prismaMock.institution.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create({ name: 'Test', slug: 'existing' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated institutions', async () => {
      prismaMock.institution.findMany.mockResolvedValue([]);
      prismaMock.institution.count.mockResolvedValue(0);

      const result = await service.findAll({});
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should find institution by id', async () => {
      prismaMock.institution.findUnique.mockResolvedValue({ id: 'inst-1', name: 'Test' });
      const result = await service.findOne('inst-1');
      expect(result.id).toBe('inst-1');
    });

    it('should throw if not found', async () => {
      prismaMock.institution.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update institution', async () => {
      prismaMock.institution.findUnique.mockResolvedValue({
        id: 'inst-1', name: 'Old', slug: 'old', status: InstitutionStatus.ACTIVE,
      });
      prismaMock.institution.update.mockResolvedValue({
        id: 'inst-1', name: 'New', slug: 'old', status: InstitutionStatus.ACTIVE,
      });

      const result = await service.update('inst-1', { name: 'New' }, 'user-1');
      expect(result.name).toBe('New');
    });

    it('should reject slug conflict', async () => {
      prismaMock.institution.findUnique
        .mockResolvedValueOnce({ id: 'inst-1', name: 'X', slug: 'x', status: InstitutionStatus.ACTIVE })
        .mockResolvedValueOnce({ id: 'other' });

      await expect(
        service.update('inst-1', { slug: 'taken' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate institution', async () => {
      prismaMock.institution.findUnique.mockResolvedValue({
        id: 'inst-1', status: InstitutionStatus.ACTIVE,
      });
      prismaMock.institution.update.mockResolvedValue({
        id: 'inst-1', status: InstitutionStatus.INACTIVE,
      });

      const result = await service.deactivate('inst-1', 'user-1');
      expect(result.status).toBe(InstitutionStatus.INACTIVE);
    });

    it('should be idempotent if already inactive', async () => {
      prismaMock.institution.findUnique.mockResolvedValue({
        id: 'inst-1', status: InstitutionStatus.INACTIVE,
      });

      const result = await service.deactivate('inst-1', 'user-1');
      expect(result.status).toBe(InstitutionStatus.INACTIVE);
      expect(prismaMock.institution.update).not.toHaveBeenCalled();
    });
  });
});
