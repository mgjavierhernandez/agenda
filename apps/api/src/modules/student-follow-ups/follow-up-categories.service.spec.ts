import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { FollowUpCategoriesService } from './follow-up-categories.service';

type PrismaMock = {
  followUpCategory: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  studentFollowUp: {
    count: jest.Mock;
  };
};

type AuditServiceMock = { log: jest.Mock };

describe('FollowUpCategoriesService', () => {
  let service: FollowUpCategoriesService;
  let prismaMock: PrismaMock;
  let auditServiceMock: AuditServiceMock;

  const institutionId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const categoryId = '00000000-0000-0000-0000-000000000003';

  beforeEach(() => {
    prismaMock = {
      followUpCategory: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      studentFollowUp: {
        count: jest.fn(),
      },
    };
    auditServiceMock = { log: jest.fn().mockResolvedValue(undefined) };

    service = new FollowUpCategoriesService(
      prismaMock as unknown as import('../../common/prisma').PrismaService,
      auditServiceMock as unknown as import('../../common/audit/audit.service').AuditService,
    );
  });

  describe('create', () => {
    it('should create a category', async () => {
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);
      const created = { id: categoryId, institutionId, name: 'Académico', description: null, active: true, createdAt: new Date(), updatedAt: new Date() };
      prismaMock.followUpCategory.create.mockResolvedValue(created);

      const result = await service.create(institutionId, { name: 'Académico' }, userId);

      expect(result.name).toBe('Académico');
      expect(prismaMock.followUpCategory.findFirst).toHaveBeenCalledWith({
        where: { institutionId, name: 'Académico' },
        select: { id: true },
      });
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          institutionId,
          action: 'STUDENT_FOLLOW_UP_CATEGORY_CREATED',
        }),
      );
    });

    it('should trim name', async () => {
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);
      prismaMock.followUpCategory.create.mockResolvedValue({
        id: categoryId, institutionId, name: 'Académico', description: null, active: true, createdAt: new Date(), updatedAt: new Date(),
      });

      await service.create(institutionId, { name: '  Académico  ' }, userId);

      expect(prismaMock.followUpCategory.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Académico' }) }),
      );
    });

    it('should reject duplicate name within same institution', async () => {
      prismaMock.followUpCategory.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(institutionId, { name: 'Académico' }, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow same name in different institution', async () => {
      const otherInstitution = '00000000-0000-0000-0000-000000000099';
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);
      prismaMock.followUpCategory.create.mockResolvedValue({
        id: categoryId, institutionId: otherInstitution, name: 'Académico', description: null, active: true, createdAt: new Date(), updatedAt: new Date(),
      });

      const result = await service.create(otherInstitution, { name: 'Académico' }, userId);

      expect(result.institutionId).toBe(otherInstitution);
    });

    it('should include description when provided', async () => {
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);
      prismaMock.followUpCategory.create.mockResolvedValue({
        id: categoryId, institutionId, name: 'Académico', description: 'Test desc', active: true, createdAt: new Date(), updatedAt: new Date(),
      });

      await service.create(institutionId, { name: 'Académico', description: 'Test desc' }, userId);

      expect(prismaMock.followUpCategory.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ description: 'Test desc' }) }),
      );
    });
  });

  describe('findAll', () => {
    it('should return categories for the institution only', async () => {
      const cats = [{ id: categoryId, name: 'Académico' }];
      prismaMock.followUpCategory.findMany.mockResolvedValue(cats);

      const result = await service.findAll(institutionId);

      expect(result).toEqual(cats);
      expect(prismaMock.followUpCategory.findMany).toHaveBeenCalledWith({
        where: { institutionId },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      const cat = { id: categoryId, institutionId, name: 'Académico' };
      prismaMock.followUpCategory.findFirst.mockResolvedValue(cat);

      const result = await service.findOne(institutionId, categoryId);

      expect(result).toEqual(cat);
    });

    it('should throw NotFoundException for non-existent category', async () => {
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(institutionId, categoryId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for cross-tenant access', async () => {
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(institutionId, categoryId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const existing = { id: categoryId, institutionId, name: 'Académico', description: null, active: true, createdAt: new Date(), updatedAt: new Date() };

    it('should update a category', async () => {
      prismaMock.followUpCategory.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      prismaMock.followUpCategory.update.mockResolvedValue({ ...existing, name: 'Nuevo Nombre' });

      const result = await service.update(institutionId, categoryId, { name: 'Nuevo Nombre' }, userId);

      expect(result.name).toBe('Nuevo Nombre');
      expect(auditServiceMock.log).toHaveBeenCalled();
    });

    it('should reject update for non-existent category', async () => {
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, categoryId, { name: 'Test' }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject duplicate name on update', async () => {
      prismaMock.followUpCategory.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ id: 'other-id' });

      await expect(
        service.update(institutionId, categoryId, { name: 'Convivencia' }, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow keeping the same name on update', async () => {
      prismaMock.followUpCategory.findFirst.mockResolvedValue(existing);
      prismaMock.followUpCategory.update.mockResolvedValue(existing);

      const result = await service.update(institutionId, categoryId, { name: 'Académico' }, userId);

      expect(result.name).toBe('Académico');
    });

    it('should allow deactivating', async () => {
      prismaMock.followUpCategory.findFirst.mockResolvedValue(existing);
      prismaMock.followUpCategory.update.mockResolvedValue({ ...existing, active: false });

      const result = await service.update(institutionId, categoryId, { active: false }, userId);

      expect(result.active).toBe(false);
    });
  });

  describe('remove', () => {
    const existing = { id: categoryId, institutionId, name: 'Académico', description: null, active: true, createdAt: new Date(), updatedAt: new Date() };

    it('should delete a category when not in use', async () => {
      prismaMock.followUpCategory.findFirst.mockResolvedValue(existing);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);
      prismaMock.followUpCategory.delete.mockResolvedValue(existing);

      const result = await service.remove(institutionId, categoryId, userId);

      expect(result.success).toBe(true);
      expect(prismaMock.followUpCategory.delete).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
    });

    it('should reject delete when category is in use', async () => {
      prismaMock.followUpCategory.findFirst.mockResolvedValue(existing);
      prismaMock.studentFollowUp.count.mockResolvedValue(3);

      await expect(
        service.remove(institutionId, categoryId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject delete for non-existent category', async () => {
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(institutionId, categoryId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
