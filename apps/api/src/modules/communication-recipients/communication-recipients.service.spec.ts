import { NotFoundException } from '@nestjs/common';
import { CommunicationRecipientsService } from './communication-recipients.service';
import { CommunicationRecipientStatus } from '@prisma/client';

describe('CommunicationRecipientsService', () => {
  let service: CommunicationRecipientsService;
  let prismaMock: {
    communicationRecipient: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    user: { findUnique: jest.Mock };
  };
  let auditServiceMock: { log: jest.Mock };

  const institutionId = 'inst-1';
  const userId = 'user-1';

  beforeEach(() => {
    prismaMock = {
      communicationRecipient: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      user: { findUnique: jest.fn() },
    };

    auditServiceMock = { log: jest.fn() };

    service = new CommunicationRecipientsService(
      prismaMock as never,
      auditServiceMock as never,
    );
  });

  describe('markAsRead', () => {
    it('should mark a recipient as READ', async () => {
      prismaMock.communicationRecipient.findFirst.mockResolvedValue({
        id: 'r-1',
        institutionId,
        status: CommunicationRecipientStatus.DELIVERED,
      });
      prismaMock.communicationRecipient.update.mockResolvedValue({
        id: 'r-1',
        status: CommunicationRecipientStatus.READ,
        readAt: new Date(),
      });

      const result = await service.markAsRead(institutionId, 'r-1', userId);
      expect(result.status).toBe(CommunicationRecipientStatus.READ);
    });

    it('should return existing if already READ', async () => {
      const existing = {
        id: 'r-1',
        institutionId,
        status: CommunicationRecipientStatus.READ,
      };
      prismaMock.communicationRecipient.findFirst.mockResolvedValue(existing);

      const result = await service.markAsRead(institutionId, 'r-1', userId);
      expect(result).toEqual(existing);
      expect(prismaMock.communicationRecipient.update).not.toHaveBeenCalled();
    });

    it('should throw if not found', async () => {
      prismaMock.communicationRecipient.findFirst.mockResolvedValue(null);

      await expect(
        service.markAsRead(institutionId, 'r-1', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      prismaMock.communicationRecipient.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(institutionId, userId);
      expect(result.count).toBe(5);
    });
  });

  describe('markAllAsRead', () => {
    it('should update all DELIVERED to READ', async () => {
      prismaMock.communicationRecipient.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead(institutionId, userId);
      expect(result.updated).toBe(3);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'COMMUNICATIONS_ALL_READ' }),
      );
    });
  });
});
