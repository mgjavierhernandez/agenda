import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { StudentFollowUpSignatureService } from './student-follow-up-signature.service';
import { SignatureRequestStatus } from '@prisma/client';

type TxMock = {
  userInstitution: { findFirst: jest.Mock };
  signatureRequest: { create: jest.Mock };
  signatureRecipient: { create: jest.Mock };
};

type PrismaMock = {
  studentFollowUp: { findFirst: jest.Mock };
  followUpEntry: { findFirst: jest.Mock };
  signatureRequest: { findMany: jest.Mock };
  signatureRecipient: { findMany: jest.Mock };
  $transaction: jest.Mock;
};

type SignaturesServiceMock = {
  create: jest.Mock;
  findAll: jest.Mock;
  findOne: jest.Mock;
};

describe('StudentFollowUpSignatureService', () => {
  let service: StudentFollowUpSignatureService;
  let prismaMock: PrismaMock;
  let auditServiceMock: { log: jest.Mock };
  let authMock: { canRead: jest.Mock; canUpdate: jest.Mock };
  let signaturesServiceMock: SignaturesServiceMock;

  const institutionId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const followUpId = '00000000-0000-0000-0000-000000000003';
  const recipientId = '00000000-0000-0000-0000-000000000004';
  const entryId = '00000000-0000-0000-0000-000000000005';

  const baseFollowUp = {
    id: followUpId,
    institutionId,
    studentId: '00000000-0000-0000-0000-000000000006',
    title: 'Test',
    status: 'OPEN',
    confidentiality: 'PUBLIC' as const,
    createdById: userId,
  };

  beforeEach(() => {
    prismaMock = {
      studentFollowUp: { findFirst: jest.fn() },
      followUpEntry: { findFirst: jest.fn() },
      signatureRequest: { findMany: jest.fn() },
      signatureRecipient: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    auditServiceMock = { log: jest.fn().mockResolvedValue(undefined) };
    authMock = {
      canRead: jest.fn().mockResolvedValue({ allowed: true, reason: null }),
      canUpdate: jest.fn().mockResolvedValue({ allowed: true, reason: null }),
    };
    signaturesServiceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    service = new StudentFollowUpSignatureService(
      prismaMock as unknown as import('../../common/prisma').PrismaService,
      auditServiceMock as unknown as import('../../common/audit/audit.service').AuditService,
      authMock as unknown as import('../../common/auth/student-follow-up-authorization').StudentFollowUpAuthorizationService,
      signaturesServiceMock as unknown as import('../signatures/signatures.service').SignaturesService,
    );
  });

  describe('requestSignature', () => {
    it('should create a signature request linked to the follow-up', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(baseFollowUp);
      prismaMock.followUpEntry.findFirst.mockResolvedValue({
        id: entryId,
        followUpId,
        institutionId,
      });
      const createdRequest = {
        id: 'req-1',
        institutionId,
        followUpId,
        createdById: userId,
        title: 'Recibido de citación',
        description: null,
        dueDate: null,
        status: SignatureRequestStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const tx: TxMock = {
        userInstitution: { findFirst: jest.fn().mockResolvedValue({ id: 'm1', status: 'ACTIVE' }) },
        signatureRequest: { create: jest.fn().mockResolvedValue(createdRequest) },
        signatureRecipient: { create: jest.fn().mockResolvedValue({ id: 'sr1' }) },
      };
      prismaMock.$transaction.mockImplementation(async (fn: (tx: TxMock) => unknown) => fn(tx));

      const result = await service.requestSignature(
        institutionId,
        followUpId,
        {
          title: 'Recibido de citación',
          recipientUserIds: [recipientId],
          followUpEntryId: entryId,
        },
        userId,
      );

      expect(result.id).toBe('req-1');
      expect(tx.signatureRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            institutionId,
            followUpId,
            createdById: userId,
            followUpEntryId: entryId,
          }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SIGNATURE_REQUESTED_FROM_FOLLOW_UP' }),
      );
    });

    it('should throw Forbidden when user cannot update the follow-up', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(baseFollowUp);
      authMock.canUpdate.mockResolvedValue({ allowed: false, reason: 'NO_PERMISSION' });

      await expect(
        service.requestSignature(
          institutionId,
          followUpId,
          { title: 'x', recipientUserIds: [recipientId] },
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFound when follow-up not found', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(null);

      await expect(
        service.requestSignature(
          institutionId,
          followUpId,
          { title: 'x', recipientUserIds: [recipientId] },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject duplicate recipients', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(baseFollowUp);
      const tx: TxMock = {
        userInstitution: { findFirst: jest.fn().mockResolvedValue({ id: 'm1', status: 'ACTIVE' }) },
        signatureRequest: { create: jest.fn() },
        signatureRecipient: { create: jest.fn() },
      };
      prismaMock.$transaction.mockImplementation(async (fn: (tx: TxMock) => unknown) => fn(tx));

      await expect(
        service.requestSignature(
          institutionId,
          followUpId,
          { title: 'x', recipientUserIds: [recipientId, recipientId] },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a non-member recipient', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(baseFollowUp);
      const tx: TxMock = {
        userInstitution: { findFirst: jest.fn().mockResolvedValue(null) },
        signatureRequest: { create: jest.fn() },
        signatureRecipient: { create: jest.fn() },
      };
      prismaMock.$transaction.mockImplementation(async (fn: (tx: TxMock) => unknown) => fn(tx));

      await expect(
        service.requestSignature(
          institutionId,
          followUpId,
          { title: 'x', recipientUserIds: [recipientId] },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an entry that does not belong to the follow-up', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(baseFollowUp);
      prismaMock.followUpEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.requestSignature(
          institutionId,
          followUpId,
          { title: 'x', followUpEntryId: entryId, recipientUserIds: [recipientId] },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByFollowUp', () => {
    it('should return signature requests for an authorized reader', async () => {
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(baseFollowUp);
      prismaMock.signatureRequest.findMany.mockResolvedValue([
        {
          id: 'req-1',
          institutionId,
          followUpId,
          title: 'x',
          status: SignatureRequestStatus.PUBLISHED,
          recipients: [],
        },
      ]);

      const result = await service.findByFollowUp(institutionId, followUpId, userId);

      expect(result).toHaveLength(1);
      expect(prismaMock.signatureRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, followUpId }),
        }),
      );
    });

    it('should throw Forbidden when the reader is a super admin without access', async () => {
      authMock.canRead.mockResolvedValue({ allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' });

      await expect(service.findByFollowUp(institutionId, followUpId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
