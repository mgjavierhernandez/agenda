import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationStatus, NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const institutionId = 'inst-1';
  const userId = 'user-1';
  const notificationId = 'notif-1';

  const makeNotification = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    institutionId,
    userId,
    type: NotificationType.GENERAL,
    title: 'Test Notification',
    message: 'Test message',
    status: NotificationStatus.UNREAD,
    entityType: null,
    entityId: null,
    readAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  let prismaMock: {
    notification: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    userInstitution: {
      findFirst: jest.Mock;
    };
  };
  let auditServiceMock: { log: jest.Mock };

  beforeEach(() => {
    prismaMock = {
      notification: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      userInstitution: {
        findFirst: jest.fn(),
      },
    };
    auditServiceMock = { log: jest.fn() };

    service = new NotificationsService(prismaMock as never, auditServiceMock as never);
  });

  describe('create', () => {
    it('should create a notification for a valid user', async () => {
      prismaMock.userInstitution.findFirst.mockResolvedValue({ userId, institutionId, status: 'ACTIVE' });
      prismaMock.notification.create.mockResolvedValue(makeNotification(notificationId));

      const result = await service.create(
        institutionId,
        { type: NotificationType.GENERAL, title: 'Test', message: 'Msg', userId },
        userId,
      );

      expect(result.status).toBe(NotificationStatus.UNREAD);
      expect(result.type).toBe(NotificationType.GENERAL);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'NOTIFICATION_CREATED' }),
      );
    });

    it('should reject if target user is not in the institution', async () => {
      prismaMock.userInstitution.findFirst.mockResolvedValue(null);

      await expect(
        service.create(institutionId, { type: NotificationType.GENERAL, title: 'Test', message: 'Msg', userId }, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return notifications with unread count', async () => {
      const notif = makeNotification(notificationId);
      prismaMock.notification.findMany.mockResolvedValue([notif]);
      prismaMock.notification.count
        .mockResolvedValueOnce(1)  // total
        .mockResolvedValueOnce(1); // unread

      const result = await service.findAll(institutionId, userId, {});

      expect(result.data).toHaveLength(1);
      expect(result.unreadCount).toBe(1);
      expect(result.meta.total).toBe(1);
    });

    it('should support status filter', async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.count.mockResolvedValue(0);

      await service.findAll(institutionId, userId, { status: NotificationStatus.READ });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: NotificationStatus.READ }),
        }),
      );
    });

    it('should support type filter', async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.count.mockResolvedValue(0);

      await service.findAll(institutionId, userId, { type: NotificationType.SIGNATURE_REQUEST });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: NotificationType.SIGNATURE_REQUEST }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a notification by id', async () => {
      prismaMock.notification.findFirst.mockResolvedValue(makeNotification(notificationId));

      const result = await service.findOne(institutionId, notificationId, userId);
      expect(result.id).toBe(notificationId);
    });

    it('should throw NotFoundException when not found', async () => {
      prismaMock.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(institutionId, notificationId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsRead', () => {
    it('should mark an unread notification as read', async () => {
      prismaMock.notification.findFirst.mockResolvedValue(makeNotification(notificationId));
      prismaMock.notification.update.mockResolvedValue(
        makeNotification(notificationId, { status: NotificationStatus.READ, readAt: new Date() }),
      );

      const result = await service.markAsRead(institutionId, notificationId, userId);
      expect(result.status).toBe(NotificationStatus.READ);
    });

    it('should return existing if already read', async () => {
      prismaMock.notification.findFirst.mockResolvedValue(
        makeNotification(notificationId, { status: NotificationStatus.READ }),
      );

      const result = await service.markAsRead(institutionId, notificationId, userId);
      expect(result.status).toBe(NotificationStatus.READ);
    });

    it('should throw NotFoundException when not found', async () => {
      prismaMock.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.markAsRead(institutionId, notificationId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead(institutionId, userId);
      expect(result.count).toBe(3);
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      prismaMock.notification.findFirst.mockResolvedValue(makeNotification(notificationId));
      prismaMock.notification.delete.mockResolvedValue({});

      await expect(
        service.delete(institutionId, notificationId, userId),
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when not found', async () => {
      prismaMock.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(institutionId, notificationId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAll', () => {
    it('should delete all notifications for the user', async () => {
      prismaMock.notification.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.deleteAll(institutionId, userId);
      expect(result.count).toBe(5);
    });
  });
});
