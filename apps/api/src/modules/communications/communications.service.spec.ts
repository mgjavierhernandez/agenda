import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { CommunicationStatus, CommunicationAudience } from '@prisma/client';

describe('CommunicationsService', () => {
  let service: CommunicationsService;
  let prismaMock: {
    communication: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditServiceMock: { log: jest.Mock };
  let authzServiceMock: { getUserRoles: jest.Mock; hasPermission: jest.Mock };

  const institutionId = 'inst-1';
  const userId = 'user-1';

  beforeEach(() => {
    prismaMock = {
      communication: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    auditServiceMock = { log: jest.fn() };
    authzServiceMock = { getUserRoles: jest.fn(), hasPermission: jest.fn() };

    service = new CommunicationsService(
      prismaMock as never,
      auditServiceMock as never,
      authzServiceMock as never,
    );
  });

  describe('create', () => {
    it('should create a communication with DRAFT status', async () => {
      prismaMock.communication.create.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        title: 'Test',
        content: 'Content',
        audience: CommunicationAudience.ALL,
        status: CommunicationStatus.DRAFT,
        publishedAt: null,
        expiresAt: null,
      });

      const result = await service.create(
        institutionId,
        { title: 'Test', content: 'Content', audience: CommunicationAudience.ALL },
        userId,
      );

      expect(result.status).toBe(CommunicationStatus.DRAFT);
      expect(result.publishedAt).toBeNull();
      expect(result.institutionId).toBe(institutionId);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'COMMUNICATION_CREATED',
          institutionId,
          userId,
        }),
      );
    });

    it('should store expiresAt when provided', async () => {
      const expiresAt = '2026-12-31T23:59:59.000Z';
      prismaMock.communication.create.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        title: 'Test',
        content: 'Content',
        audience: CommunicationAudience.ALL,
        status: CommunicationStatus.DRAFT,
        publishedAt: null,
        expiresAt: new Date(expiresAt),
      });

      const result = await service.create(
        institutionId,
        { title: 'Test', content: 'Content', audience: CommunicationAudience.ALL, expiresAt },
        userId,
      );

      expect(result.expiresAt).toEqual(new Date(expiresAt));
    });
  });

  describe('findOne', () => {
    it('should find communication in current tenant', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
      });

      const result = await service.findOne(institutionId, 'comm-1');
      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.communication.findFirst).toHaveBeenCalledWith({
        where: { id: 'comm-1', institutionId },
      });
    });

    it('should throw NotFoundException for cross-tenant resource', async () => {
      prismaMock.communication.findFirst.mockResolvedValue(null);
      await expect(
        service.findOne(institutionId, 'other-tenant-comm'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return only current tenant communications', async () => {
      prismaMock.communication.findMany.mockResolvedValue([
        { id: 'c1', institutionId },
        { id: 'c2', institutionId },
      ]);
      prismaMock.communication.count.mockResolvedValue(2);

      const result = await service.findAll(institutionId, {});
      expect(result.data).toHaveLength(2);
      expect(prismaMock.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
        }),
      );
    });

    it('should apply pagination', async () => {
      prismaMock.communication.findMany.mockResolvedValue([]);
      prismaMock.communication.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, { page: 2, limit: 10 });
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(prismaMock.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should sort by publishedAt descending', async () => {
      prismaMock.communication.findMany.mockResolvedValue([]);
      prismaMock.communication.count.mockResolvedValue(0);

      await service.findAll(institutionId, {});
      expect(prismaMock.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { publishedAt: 'desc' } }),
      );
    });

    it('should filter by audience', async () => {
      prismaMock.communication.findMany.mockResolvedValue([]);
      prismaMock.communication.count.mockResolvedValue(0);

      await service.findAll(institutionId, { audience: CommunicationAudience.TEACHERS });
      expect(prismaMock.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ audience: CommunicationAudience.TEACHERS }),
        }),
      );
    });

    it('should filter by status', async () => {
      prismaMock.communication.findMany.mockResolvedValue([]);
      prismaMock.communication.count.mockResolvedValue(0);

      await service.findAll(institutionId, { status: CommunicationStatus.PUBLISHED });
      expect(prismaMock.communication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: CommunicationStatus.PUBLISHED }),
        }),
      );
    });
  });

  describe('findAllVisible', () => {
    it('should only return PUBLISHED communications visible to user role', async () => {
      prismaMock.communication.findMany.mockResolvedValue([
        { id: 'c1', institutionId, audience: CommunicationAudience.ALL, status: CommunicationStatus.PUBLISHED, expiresAt: null },
      ]);
      prismaMock.communication.count.mockResolvedValue(1);
      authzServiceMock.getUserRoles.mockResolvedValue([{ name: 'STUDENT' }]);

      const result = await service.findAllVisible(institutionId, {}, userId);
      expect(result.data).toHaveLength(1);
    });

    it('should filter out communications for other audiences', async () => {
      prismaMock.communication.findMany.mockResolvedValue([
        { id: 'c1', institutionId, audience: CommunicationAudience.TEACHERS, status: CommunicationStatus.PUBLISHED, expiresAt: null },
      ]);
      prismaMock.communication.count.mockResolvedValue(1);
      authzServiceMock.getUserRoles.mockResolvedValue([{ name: 'PARENT' }]);

      const result = await service.findAllVisible(institutionId, {}, userId);
      expect(result.data).toHaveLength(0);
    });

    it('should filter out DRAFT communications', async () => {
      prismaMock.communication.findMany.mockResolvedValue([]);
      prismaMock.communication.count.mockResolvedValue(0);

      const result = await service.findAllVisible(institutionId, {}, userId);
      expect(result.data).toHaveLength(0);
      const where = prismaMock.communication.findMany.mock.calls[0][0].where;
      expect(where.status).toBe(CommunicationStatus.PUBLISHED);
    });
  });

  describe('findOneVisible', () => {
    it('should find published communication visible to user', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        audience: CommunicationAudience.ALL,
        status: CommunicationStatus.PUBLISHED,
        expiresAt: null,
      });
      authzServiceMock.getUserRoles.mockResolvedValue([{ name: 'STUDENT' }]);

      const result = await service.findOneVisible(institutionId, 'comm-1', userId);
      expect(result.id).toBe('comm-1');
    });

    it('should throw NotFoundException for DRAFT when user is consumer', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        audience: CommunicationAudience.ALL,
        status: CommunicationStatus.DRAFT,
        expiresAt: null,
      });

      await expect(
        service.findOneVisible(institutionId, 'comm-1', userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for wrong audience', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        audience: CommunicationAudience.TEACHERS,
        status: CommunicationStatus.PUBLISHED,
        expiresAt: null,
      });
      authzServiceMock.getUserRoles.mockResolvedValue([{ name: 'PARENT' }]);

      await expect(
        service.findOneVisible(institutionId, 'comm-1', userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for cross-tenant', async () => {
      prismaMock.communication.findFirst.mockResolvedValue(null);
      await expect(
        service.findOneVisible(institutionId, 'other-comm', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update communication in current tenant', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        title: 'Old',
        content: 'Old content',
        audience: CommunicationAudience.ALL,
        status: CommunicationStatus.DRAFT,
      });
      prismaMock.communication.update.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        title: 'New',
        content: 'New content',
      });

      const result = await service.update(institutionId, 'comm-1', { title: 'New', content: 'New content' }, userId);
      expect(result.title).toBe('New');
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'COMMUNICATION_UPDATED' }),
      );
    });

    it('should not allow modifying institutionId', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        title: 'Old',
        content: 'Old content',
        audience: CommunicationAudience.ALL,
        status: CommunicationStatus.DRAFT,
      });
      prismaMock.communication.update.mockResolvedValue({ id: 'comm-1', institutionId });

      await service.update(institutionId, 'comm-1', { title: 'New' }, userId);

      const updateCall = prismaMock.communication.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('institutionId');
    });

    it('should not allow modifying status via update', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        title: 'Old',
        content: 'Old content',
        audience: CommunicationAudience.ALL,
        status: CommunicationStatus.DRAFT,
      });
      prismaMock.communication.update.mockResolvedValue({ id: 'comm-1', institutionId });

      await service.update(institutionId, 'comm-1', { title: 'New' }, userId);

      const updateCall = prismaMock.communication.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('status');
    });

    it('should throw NotFoundException for cross-tenant update', async () => {
      prismaMock.communication.findFirst.mockResolvedValue(null);
      await expect(
        service.update(institutionId, 'other-comm', { title: 'New' }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject expiresAt in the past', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        title: 'Old',
        content: 'Old content',
        audience: CommunicationAudience.ALL,
        status: CommunicationStatus.DRAFT,
      });

      await expect(
        service.update(institutionId, 'comm-1', { expiresAt: '2020-01-01T00:00:00.000Z' }, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('publish', () => {
    it('should publish a DRAFT communication', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        status: CommunicationStatus.DRAFT,
        expiresAt: null,
      });
      prismaMock.communication.update.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        status: CommunicationStatus.PUBLISHED,
        publishedAt: new Date(),
      });

      const result = await service.publish(institutionId, 'comm-1', userId);
      expect(result.status).toBe(CommunicationStatus.PUBLISHED);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'COMMUNICATION_PUBLISHED' }),
      );
    });

    it('should return existing if already PUBLISHED', async () => {
      const existing = {
        id: 'comm-1',
        institutionId,
        status: CommunicationStatus.PUBLISHED,
        publishedAt: new Date(),
        expiresAt: null,
      };
      prismaMock.communication.findFirst.mockResolvedValue(existing);

      const result = await service.publish(institutionId, 'comm-1', userId);
      expect(result).toBe(existing);
      expect(prismaMock.communication.update).not.toHaveBeenCalled();
    });

    it('should reject publishing an INACTIVE communication', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        status: CommunicationStatus.INACTIVE,
        expiresAt: null,
      });

      await expect(
        service.publish(institutionId, 'comm-1', userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for cross-tenant', async () => {
      prismaMock.communication.findFirst.mockResolvedValue(null);
      await expect(
        service.publish(institutionId, 'other-comm', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should set status to INACTIVE', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        status: CommunicationStatus.PUBLISHED,
      });
      prismaMock.communication.update.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        status: CommunicationStatus.INACTIVE,
      });

      const result = await service.deactivate(institutionId, 'comm-1', userId);
      expect(result.status).toBe(CommunicationStatus.INACTIVE);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'COMMUNICATION_DEACTIVATED' }),
      );
    });

    it('should return existing if already INACTIVE', async () => {
      const existing = {
        id: 'comm-1',
        institutionId,
        status: CommunicationStatus.INACTIVE,
      };
      prismaMock.communication.findFirst.mockResolvedValue(existing);

      const result = await service.deactivate(institutionId, 'comm-1', userId);
      expect(result).toBe(existing);
      expect(prismaMock.communication.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for cross-tenant', async () => {
      prismaMock.communication.findFirst.mockResolvedValue(null);
      await expect(
        service.deactivate(institutionId, 'other-comm', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('audience authorization', () => {
    it('should allow TEACHERS audience for TEACHER role', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        audience: CommunicationAudience.TEACHERS,
        status: CommunicationStatus.PUBLISHED,
        expiresAt: null,
      });
      authzServiceMock.getUserRoles.mockResolvedValue([{ name: 'TEACHER' }]);

      const result = await service.findOneVisible(institutionId, 'comm-1', userId);
      expect(result.id).toBe('comm-1');
    });

    it('should allow PARENTS audience for PARENT role', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        audience: CommunicationAudience.PARENTS,
        status: CommunicationStatus.PUBLISHED,
        expiresAt: null,
      });
      authzServiceMock.getUserRoles.mockResolvedValue([{ name: 'PARENT' }]);

      const result = await service.findOneVisible(institutionId, 'comm-1', userId);
      expect(result.id).toBe('comm-1');
    });

    it('should allow STUDENTS audience for STUDENT role', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        audience: CommunicationAudience.STUDENTS,
        status: CommunicationStatus.PUBLISHED,
        expiresAt: null,
      });
      authzServiceMock.getUserRoles.mockResolvedValue([{ name: 'STUDENT' }]);

      const result = await service.findOneVisible(institutionId, 'comm-1', userId);
      expect(result.id).toBe('comm-1');
    });

    it('should allow INSTITUTION_ADMIN to view any audience', async () => {
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        audience: CommunicationAudience.TEACHERS,
        status: CommunicationStatus.PUBLISHED,
        expiresAt: null,
      });
      authzServiceMock.getUserRoles.mockResolvedValue([{ name: 'INSTITUTION_ADMIN' }]);

      const result = await service.findOneVisible(institutionId, 'comm-1', userId);
      expect(result.id).toBe('comm-1');
    });

    it('should reject expired communications', async () => {
      const pastDate = new Date('2020-01-01T00:00:00.000Z');
      prismaMock.communication.findFirst.mockResolvedValue({
        id: 'comm-1',
        institutionId,
        audience: CommunicationAudience.ALL,
        status: CommunicationStatus.PUBLISHED,
        expiresAt: pastDate,
      });

      await expect(
        service.findOneVisible(institutionId, 'comm-1', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
