import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FollowUpCitationsService } from './follow-up-citations.service';
import { FollowUpCitationStatus } from '@prisma/client';

type PrismaMock = {
  studentFollowUp: { findFirst: jest.Mock };
  followUpCitation: {
    create: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

type AuditServiceMock = { log: jest.Mock };

type AuthMock = {
  canRead: jest.Mock;
  canUpdate: jest.Mock;
};

describe('FollowUpCitationsService', () => {
  let service: FollowUpCitationsService;
  let prismaMock: PrismaMock;
  let auditServiceMock: AuditServiceMock;
  let authMock: AuthMock;

  const institutionId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const followUpId = '00000000-0000-0000-0000-000000000003';
  const citationId = '00000000-0000-0000-0000-000000000004';

  const baseFollowUp = {
    id: followUpId,
    institutionId,
    studentId: '00000000-0000-0000-0000-000000000005',
    title: 'Test',
    status: 'OPEN',
    confidentiality: 'PUBLIC' as const,
    student: { id: '00000000-0000-0000-0000-000000000005' },
  };

  beforeEach(() => {
    prismaMock = {
      studentFollowUp: { findFirst: jest.fn() },
      followUpCitation: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    auditServiceMock = { log: jest.fn().mockResolvedValue(undefined) };
    authMock = {
      canRead: jest.fn().mockResolvedValue({ allowed: true, reason: null }),
      canUpdate: jest.fn().mockResolvedValue({ allowed: true, reason: null }),
    };

    service = new FollowUpCitationsService(
      prismaMock as unknown as import('../../common/prisma').PrismaService,
      auditServiceMock as unknown as import('../../common/audit/audit.service').AuditService,
      authMock as unknown as import('../../common/auth/student-follow-up-authorization').StudentFollowUpAuthorizationService,
    );
  });

  describe('create', () => {
    it('should create a citation on an open follow-up', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(baseFollowUp);
      const created = {
        id: citationId,
        institutionId,
        followUpId,
        createdById: userId,
        scheduledAt: new Date(),
        reason: 'Reunión con acudiente',
        objective: null,
        status: FollowUpCitationStatus.SCHEDULED,
        result: null,
        attendedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.followUpCitation.create.mockResolvedValue(created);

      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const result = await service.create(
        institutionId,
        followUpId,
        { scheduledAt: future, reason: 'Reunión con acudiente' },
        userId,
      );

      expect(result.id).toBe(citationId);
      expect(prismaMock.followUpCitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ followUpId, createdById: userId }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          institutionId,
          action: 'CITATION_CREATED',
          entityType: 'FollowUpCitation',
        }),
      );
    });

    it('should throw NotFound when follow-up does not exist or is not in institution', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          institutionId,
          followUpId,
          { scheduledAt: new Date(Date.now() + 60000).toISOString(), reason: 'x' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw Forbidden when user cannot read the follow-up', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(baseFollowUp);
      authMock.canRead.mockResolvedValue({ allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' });
      authMock.canUpdate.mockResolvedValue({ allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' });

      await expect(
        service.create(
          institutionId,
          followUpId,
          { scheduledAt: new Date(Date.now() + 60000).toISOString(), reason: 'x' },
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequest when scheduled time is in the past', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(baseFollowUp);

      await expect(
        service.create(
          institutionId,
          followUpId,
          { scheduledAt: new Date(Date.now() - 60000).toISOString(), reason: 'x' },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequest when follow-up is closed', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        ...baseFollowUp,
        status: 'CLOSED',
      });

      await expect(
        service.create(
          institutionId,
          followUpId,
          { scheduledAt: new Date(Date.now() + 60000).toISOString(), reason: 'x' },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated citations scoped by institution and followUp', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(baseFollowUp);
      const citation = {
        id: citationId,
        institutionId,
        followUpId,
        createdById: userId,
        scheduledAt: new Date(),
        reason: 'r',
        objective: null,
        status: FollowUpCitationStatus.SCHEDULED,
        result: null,
        attendedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.followUpCitation.findMany.mockResolvedValue([citation]);
      prismaMock.followUpCitation.count.mockResolvedValue(1);

      const result = await service.findAll(institutionId, followUpId, {}, userId);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prismaMock.followUpCitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, followUpId }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update status and record audit + notification path', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(baseFollowUp);
      const existing = {
        id: citationId,
        institutionId,
        followUpId,
        createdById: userId,
        scheduledAt: new Date(),
        reason: 'r',
        objective: null,
        status: FollowUpCitationStatus.SCHEDULED,
        result: null,
        attendedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.followUpCitation.findFirst.mockResolvedValue(existing);
      prismaMock.followUpCitation.update.mockResolvedValue({
        ...existing,
        status: FollowUpCitationStatus.COMPLETED,
        attendedAt: new Date(),
      });

      const result = await service.update(
        institutionId,
        followUpId,
        citationId,
        { status: FollowUpCitationStatus.COMPLETED },
        userId,
      );

      expect(result.status).toBe(FollowUpCitationStatus.COMPLETED);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CITATION_COMPLETED',
        }),
      );
    });

    it('should throw NotFound when citation does not exist', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(baseFollowUp);
      prismaMock.followUpCitation.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, followUpId, citationId, { reason: 'x' }, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete the citation and audit', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(baseFollowUp);
      const existing = {
        id: citationId,
        institutionId,
        followUpId,
        createdById: userId,
        scheduledAt: new Date(),
        reason: 'r',
        objective: null,
        status: FollowUpCitationStatus.SCHEDULED,
        result: null,
        attendedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.followUpCitation.findFirst.mockResolvedValue(existing);
      prismaMock.followUpCitation.delete.mockResolvedValue(existing);

      await service.remove(institutionId, followUpId, citationId, userId);

      expect(prismaMock.followUpCitation.delete).toHaveBeenCalledWith({
        where: { id: citationId },
      });
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CITATION_DELETED' }),
      );
    });
  });
});
