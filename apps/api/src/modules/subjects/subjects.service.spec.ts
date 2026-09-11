import { NotFoundException, ConflictException } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { SubjectStatus } from '@prisma/client';

describe('SubjectsService', () => {
  let service: SubjectsService;
  let prismaMock: {
    subject: {
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
      subject: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    auditServiceMock = { log: jest.fn() };

    service = new SubjectsService(prismaMock as never, auditServiceMock as never);
  });

  describe('create', () => {
    it('should create a subject with tenant institutionId', async () => {
      prismaMock.subject.findUnique.mockResolvedValue(null);
      prismaMock.subject.create.mockResolvedValue({
        id: 'subject-1',
        institutionId,
        code: 'MAT-S',
        name: 'Matemáticas',
        description: 'Asignatura de matemáticas',
        status: SubjectStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        institutionId,
        { code: 'MAT-S', name: 'Matemáticas', description: 'Asignatura de matemáticas' },
        userId,
      );

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.subject.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institutionId }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBJECT_CREATED',
          institutionId,
          userId,
        }),
      );
    });

    it('should reject duplicate code within same tenant', async () => {
      prismaMock.subject.findUnique.mockResolvedValue({
        id: 'existing',
        institutionId,
      });

      await expect(
        service.create(institutionId, { code: 'MAT-S', name: 'Matemáticas' }, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow same code in different tenant', async () => {
      prismaMock.subject.findUnique.mockResolvedValue(null);
      prismaMock.subject.create.mockResolvedValue({
        id: 'subject-2',
        institutionId: 'inst-2',
        code: 'MAT-S',
        name: 'Matemáticas',
        status: SubjectStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create('inst-2', { code: 'MAT-S', name: 'Matemáticas' }, userId);

      expect(result.institutionId).toBe('inst-2');
    });
  });

  describe('findOne', () => {
    it('should find subject only in current tenant', async () => {
      prismaMock.subject.findFirst.mockResolvedValue({
        id: 'subject-1',
        institutionId,
      });

      const result = await service.findOne(institutionId, 'subject-1');

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.subject.findFirst).toHaveBeenCalledWith({
        where: { id: 'subject-1', institutionId },
      });
    });

    it('should throw NotFoundException for cross-tenant resource', async () => {
      prismaMock.subject.findFirst.mockResolvedValue(null);

      await expect(service.findOne(institutionId, 'subject-from-other-tenant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return only current tenant subjects', async () => {
      prismaMock.subject.findMany.mockResolvedValue([
        { id: 's1', institutionId },
        { id: 's2', institutionId },
      ]);
      prismaMock.subject.count.mockResolvedValue(2);

      const result = await service.findAll(institutionId, {});

      expect(result.data).toHaveLength(2);
      expect(prismaMock.subject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
        }),
      );
    });

    it('should apply pagination', async () => {
      prismaMock.subject.findMany.mockResolvedValue([]);
      prismaMock.subject.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, { page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(prismaMock.subject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by search term within tenant', async () => {
      prismaMock.subject.findMany.mockResolvedValue([]);
      prismaMock.subject.count.mockResolvedValue(0);

      await service.findAll(institutionId, { search: 'MAT' });

      expect(prismaMock.subject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institutionId,
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should filter by status within tenant', async () => {
      prismaMock.subject.findMany.mockResolvedValue([]);
      prismaMock.subject.count.mockResolvedValue(0);

      await service.findAll(institutionId, { status: SubjectStatus.ACTIVE });

      expect(prismaMock.subject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institutionId,
            status: SubjectStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update subject only in current tenant', async () => {
      prismaMock.subject.findFirst.mockResolvedValue({
        id: 'subject-1',
        institutionId,
        code: 'MAT-S',
        name: 'Matemáticas',
        description: null,
        status: SubjectStatus.ACTIVE,
      });
      prismaMock.subject.update.mockResolvedValue({
        id: 'subject-1',
        institutionId,
        name: 'Matemáticas II',
      });

      const result = await service.update(
        institutionId,
        'subject-1',
        { name: 'Matemáticas II' },
        userId,
      );

      expect(result.name).toBe('Matemáticas II');
    });

    it('should throw NotFoundException for cross-tenant update', async () => {
      prismaMock.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'other-tenant-subject', { name: 'X' }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not allow modifying institutionId', async () => {
      prismaMock.subject.findFirst.mockResolvedValue({
        id: 'subject-1',
        institutionId,
        code: 'MAT-S',
        name: 'Matemáticas',
        status: SubjectStatus.ACTIVE,
      });
      prismaMock.subject.update.mockResolvedValue({
        id: 'subject-1',
        institutionId,
      });

      await service.update(institutionId, 'subject-1', { name: 'X' }, userId);

      const updateCall = prismaMock.subject.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('institutionId');
    });

    it('should reject duplicate code within same tenant on update', async () => {
      prismaMock.subject.findFirst
        .mockResolvedValueOnce({
          id: 'subject-1',
          institutionId,
          code: 'MAT-S',
          name: 'Matemáticas',
          status: SubjectStatus.ACTIVE,
        })
        .mockResolvedValueOnce({
          id: 'subject-2',
          institutionId,
        });

      await expect(
        service.update(institutionId, 'subject-1', { code: 'CIE-S' }, userId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('should set status to INACTIVE', async () => {
      prismaMock.subject.findFirst.mockResolvedValue({
        id: 'subject-1',
        institutionId,
        code: 'MAT-S',
        name: 'Matemáticas',
        status: SubjectStatus.ACTIVE,
      });
      prismaMock.subject.update.mockResolvedValue({
        id: 'subject-1',
        institutionId,
        status: SubjectStatus.INACTIVE,
      });

      const result = await service.deactivate(institutionId, 'subject-1', userId);

      expect(result.status).toBe(SubjectStatus.INACTIVE);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBJECT_DEACTIVATED',
        }),
      );
    });

    it('should throw NotFoundException for cross-tenant deactivate', async () => {
      prismaMock.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivate(institutionId, 'other-tenant-subject', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
