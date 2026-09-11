/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SignaturesService } from './signatures.service';
import { SignatureRequestStatus, SignatureRecipientStatus } from '@prisma/client';

describe('SignaturesService', () => {
  let service: SignaturesService;

  const institutionId = 'inst-1';
  const userId = 'user-1';
  const otherUserId = 'user-2';
  const request1 = 'req-1';
  const recipient1 = 'rec-1';

  const makeUserInstitution = (uid: string, iid: string, status = 'ACTIVE') => ({
    userId: uid,
    institutionId: iid,
    status,
    id: `ui-${uid}-${iid}`,
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const makeRequest = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    institutionId,
    title: 'Test Request',
    description: null,
    status: SignatureRequestStatus.DRAFT,
    dueDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const makeRecipient = (
    id: string,
    sigRequestId: string,
    uid: string,
    overrides: Record<string, unknown> = {},
  ) => ({
    id,
    signatureRequestId: sigRequestId,
    userId: uid,
    status: SignatureRecipientStatus.PENDING,
    signedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  let prismaMock: {
    $transaction: jest.Mock;
    signatureRequest: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    signatureRecipient: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
    userInstitution: {
      findFirst: jest.Mock;
    };
  };
  let auditServiceMock: { log: jest.Mock };

  beforeEach(() => {
    prismaMock = {
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          signatureRequest: {
            create: jest.fn(),
            update: jest.fn(),
          },
          signatureRecipient: {
            create: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
          },
        };
        return cb(tx);
      }),
      signatureRequest: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      signatureRecipient: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      userInstitution: {
        findFirst: jest.fn(),
      },
    };
    auditServiceMock = { log: jest.fn() };

    service = new SignaturesService(
      prismaMock as never,
      auditServiceMock as never,
      { create: jest.fn() } as never,
      {
        sendSignatureRequest: jest.fn(),
        sendPasswordReset: jest.fn(),
        sendCommunication: jest.fn(),
      } as never,
      {} as never,
    );
  });

  describe('create', () => {
    it('should create a signature request with recipients in DRAFT status', async () => {
      prismaMock.userInstitution.findFirst.mockResolvedValue(
        makeUserInstitution(userId, institutionId),
      );
      prismaMock.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          signatureRequest: {
            create: jest.fn().mockResolvedValue(makeRequest(request1)),
          },
          signatureRecipient: {
            create: jest.fn().mockResolvedValue(makeRecipient(recipient1, request1, userId)),
          },
        };
        return cb(tx);
      });

      const result = await service.create(
        institutionId,
        { title: 'Test', recipientUserIds: [userId] },
        userId,
      );

      expect(result.status).toBe(SignatureRequestStatus.DRAFT);
      expect(result.recipients).toHaveLength(1);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SIGNATURE_REQUEST_CREATED' }),
      );
    });

    it('should reject a user not in the institution', async () => {
      prismaMock.userInstitution.findFirst.mockResolvedValue(null);

      await expect(
        service.create(institutionId, { title: 'Test', recipientUserIds: [userId] }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate recipient user IDs', async () => {
      prismaMock.userInstitution.findFirst.mockResolvedValue(
        makeUserInstitution(userId, institutionId),
      );

      await expect(
        service.create(
          institutionId,
          { title: 'Test', recipientUserIds: [userId, userId] },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return requests with recipients for managers', async () => {
      const req = makeRequest(request1, { status: SignatureRequestStatus.PUBLISHED });
      prismaMock.signatureRequest.findMany.mockResolvedValue([{ ...req, recipients: [] }]);
      prismaMock.signatureRequest.count.mockResolvedValue(1);

      const result = await service.findAll(institutionId, { page: 1, limit: 20 }, userId, true);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status for non-managers to requests where they are recipients', async () => {
      prismaMock.signatureRequest.findMany.mockResolvedValue([]);
      prismaMock.signatureRequest.count.mockResolvedValue(0);

      const result = await service.findAll(
        institutionId,
        { status: SignatureRequestStatus.PUBLISHED },
        userId,
        false,
      );

      expect(result.data).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return request with recipients', async () => {
      const req = makeRequest(request1, { status: SignatureRequestStatus.PUBLISHED });
      prismaMock.signatureRequest.findFirst.mockResolvedValue({
        ...req,
        recipients: [makeRecipient(recipient1, request1, userId)],
      });

      const result = await service.findOne(institutionId, request1, userId, true);
      expect(result.id).toBe(request1);
      expect(result.recipients).toHaveLength(1);
    });

    it('should throw NotFoundException when request does not exist', async () => {
      prismaMock.signatureRequest.findFirst.mockResolvedValue(null);

      await expect(service.findOne(institutionId, request1, userId, true)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should hide DRAFT requests from non-managers', async () => {
      prismaMock.signatureRequest.findFirst.mockResolvedValue({
        ...makeRequest(request1, { status: SignatureRequestStatus.DRAFT }),
        recipients: [makeRecipient(recipient1, request1, userId)],
      });

      await expect(service.findOne(institutionId, request1, userId, false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for non-recipients of non-DRAFT requests', async () => {
      prismaMock.signatureRequest.findFirst.mockResolvedValue({
        ...makeRequest(request1, { status: SignatureRequestStatus.PUBLISHED }),
        recipients: [makeRecipient(recipient1, request1, otherUserId)],
      });

      await expect(service.findOne(institutionId, request1, userId, false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update title and description on DRAFT request', async () => {
      const existing = makeRequest(request1, {
        status: SignatureRequestStatus.DRAFT,
        title: 'Old',
        description: 'Old desc',
      });
      prismaMock.signatureRequest.findFirst.mockResolvedValue({
        ...existing,
        recipients: [makeRecipient(recipient1, request1, userId)],
      });
      prismaMock.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          signatureRequest: {
            update: jest
              .fn()
              .mockResolvedValue({ ...existing, title: 'New', description: 'New desc' }),
          },
          signatureRecipient: {
            deleteMany: jest.fn(),
            create: jest.fn().mockResolvedValue(makeRecipient(recipient1, request1, userId)),
            findMany: jest.fn(),
            count: jest.fn(),
          },
        };
        return cb(tx);
      });

      const result = await service.update(
        institutionId,
        request1,
        { title: 'New', description: 'New desc' },
        userId,
      );
      expect(result.title).toBe('New');
      expect(result.description).toBe('New desc');
    });

    it('should reject update on non-DRAFT request', async () => {
      prismaMock.signatureRequest.findFirst.mockResolvedValue({
        ...makeRequest(request1, { status: SignatureRequestStatus.PUBLISHED }),
        recipients: [],
      });

      await expect(
        service.update(institutionId, request1, { title: 'New' }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when request does not exist', async () => {
      prismaMock.signatureRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, request1, { title: 'New' }, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    it('should publish a DRAFT request with recipients', async () => {
      const existing = makeRequest(request1, { status: SignatureRequestStatus.DRAFT });
      prismaMock.signatureRequest.findFirst.mockResolvedValue({
        ...existing,
        recipients: [makeRecipient(recipient1, request1, userId)],
      });
      prismaMock.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          signatureRequest: {
            update: jest
              .fn()
              .mockResolvedValue({
                ...existing,
                status: SignatureRequestStatus.PUBLISHED,
                recipients: [makeRecipient(recipient1, request1, userId)],
              }),
          },
          signatureRecipient: {
            findMany: jest.fn().mockResolvedValue([makeRecipient(recipient1, request1, userId)]),
            count: jest.fn(),
            deleteMany: jest.fn(),
            create: jest.fn(),
          },
        };
        return cb(tx);
      });

      const result = await service.publish(institutionId, request1, userId);
      expect(result.status).toBe(SignatureRequestStatus.PUBLISHED);
      expect(result.recipients).toHaveLength(1);
    });

    it('should reject publish on non-DRAFT request', async () => {
      prismaMock.signatureRequest.findFirst.mockResolvedValue({
        ...makeRequest(request1, { status: SignatureRequestStatus.PUBLISHED }),
        recipients: [makeRecipient(recipient1, request1, userId)],
      });

      await expect(service.publish(institutionId, request1, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject publish with no recipients', async () => {
      prismaMock.signatureRequest.findFirst.mockResolvedValue({
        ...makeRequest(request1, { status: SignatureRequestStatus.DRAFT }),
        recipients: [],
      });

      await expect(service.publish(institutionId, request1, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject publish with past dueDate', async () => {
      const pastDate = new Date('2020-01-01');
      prismaMock.signatureRequest.findFirst.mockResolvedValue({
        ...makeRequest(request1, { status: SignatureRequestStatus.DRAFT, dueDate: pastDate }),
        recipients: [makeRecipient(recipient1, request1, userId)],
      });

      await expect(service.publish(institutionId, request1, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('sign', () => {
    it('should sign a published request and update recipient status', async () => {
      const req = makeRequest(request1, { status: SignatureRequestStatus.PUBLISHED });
      const rec = makeRecipient(recipient1, request1, userId);
      prismaMock.signatureRequest.findFirst.mockResolvedValue({ ...req, recipients: [rec] });

      prismaMock.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          signatureRecipient: {
            update: jest
              .fn()
              .mockResolvedValue({
                ...rec,
                status: SignatureRecipientStatus.SIGNED,
                signedAt: new Date(),
              }),
            count: jest.fn().mockResolvedValue(0),
            findMany: jest.fn(),
          },
          signatureRequest: {
            update: jest
              .fn()
              .mockResolvedValue({
                ...req,
                status: SignatureRequestStatus.COMPLETED,
                recipients: [{ ...rec, status: SignatureRecipientStatus.SIGNED }],
              }),
          },
        };
        return cb(tx);
      });

      const result = await service.sign(institutionId, request1, userId);
      expect(result.status).toBe(SignatureRequestStatus.COMPLETED);
    });

    it('should throw ForbiddenException for non-recipients', async () => {
      const req = makeRequest(request1, { status: SignatureRequestStatus.PUBLISHED });
      prismaMock.signatureRequest.findFirst.mockResolvedValue({
        ...req,
        recipients: [makeRecipient(recipient1, request1, otherUserId)],
      });

      await expect(service.sign(institutionId, request1, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject signing an expired request', async () => {
      const req = makeRequest(request1, {
        status: SignatureRequestStatus.EXPIRED,
        dueDate: new Date('2020-01-01'),
      });
      prismaMock.signatureRequest.findFirst.mockResolvedValue({
        ...req,
        recipients: [makeRecipient(recipient1, request1, userId)],
      });

      await expect(service.sign(institutionId, request1, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when request does not exist', async () => {
      prismaMock.signatureRequest.findFirst.mockResolvedValue(null);

      await expect(service.sign(institutionId, request1, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('decline', () => {
    it('should decline a published request for a recipient', async () => {
      const req = makeRequest(request1, { status: SignatureRequestStatus.PUBLISHED });
      const rec = makeRecipient(recipient1, request1, userId);
      const declinedRec = { ...rec, status: SignatureRecipientStatus.DECLINED };
      prismaMock.signatureRequest.findFirst
        .mockResolvedValueOnce({ ...req, recipients: [rec] })
        .mockResolvedValueOnce({ ...req, recipients: [rec] })
        .mockResolvedValueOnce({ ...req, recipients: [declinedRec] });

      prismaMock.signatureRecipient.update.mockResolvedValue(declinedRec);

      const result = await service.decline(institutionId, request1, userId);
      expect(result.recipients[0].status).toBe(SignatureRecipientStatus.DECLINED);
    });

    it('should throw ForbiddenException for non-recipients', async () => {
      const req = makeRequest(request1, { status: SignatureRequestStatus.PUBLISHED });
      prismaMock.signatureRequest.findFirst.mockResolvedValue({
        ...req,
        recipients: [makeRecipient(recipient1, request1, otherUserId)],
      });

      await expect(service.decline(institutionId, request1, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when request does not exist', async () => {
      prismaMock.signatureRequest.findFirst.mockResolvedValue(null);

      await expect(service.decline(institutionId, request1, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate a DRAFT request', async () => {
      const req = makeRequest(request1, { status: SignatureRequestStatus.DRAFT });
      prismaMock.signatureRequest.findFirst.mockResolvedValue({
        ...req,
        recipients: [makeRecipient(recipient1, request1, userId)],
      });
      prismaMock.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          signatureRequest: {
            update: jest
              .fn()
              .mockResolvedValue({
                ...req,
                status: SignatureRequestStatus.INACTIVE,
                recipients: [],
              }),
          },
          signatureRecipient: {
            findMany: jest.fn().mockResolvedValue([makeRecipient(recipient1, request1, userId)]),
            count: jest.fn(),
            deleteMany: jest.fn(),
            create: jest.fn(),
          },
        };
        return cb(tx);
      });

      const result = await service.deactivate(institutionId, request1, userId);
      expect(result.status).toBe(SignatureRequestStatus.INACTIVE);
    });

    it('should throw NotFoundException when request does not exist', async () => {
      prismaMock.signatureRequest.findFirst.mockResolvedValue(null);

      await expect(service.deactivate(institutionId, request1, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return existing if already INACTIVE', async () => {
      prismaMock.signatureRequest.findFirst.mockResolvedValue({
        ...makeRequest(request1, { status: SignatureRequestStatus.INACTIVE }),
        recipients: [],
      });

      const result = await service.deactivate(institutionId, request1, userId);
      expect(result.status).toBe(SignatureRequestStatus.INACTIVE);
    });
  });
});
