import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import {
  Notification,
  NotificationStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateNotificationDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Notification> {
    const membership = await this.prisma.userInstitution.findFirst({
      where: {
        userId: dto.userId,
        institutionId,
        status: 'ACTIVE',
      },
    });

    if (!membership) {
      throw new BadRequestException(
        `User ${dto.userId} is not a member of this institution`,
      );
    }

    const notification = await this.prisma.notification.create({
      data: {
        institutionId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'NOTIFICATION_CREATED',
      entityType: 'Notification',
      entityId: notification.id,
      newValues: {
        type: notification.type,
        title: notification.title,
        targetUserId: dto.userId,
      },
      ipAddress,
    });

    return notification;
  }

  async findAll(
    institutionId: string,
    currentUserId: string,
    query: ListNotificationsQueryDto,
  ): Promise<{
    data: Notification[];
    meta: { page: number; limit: number; total: number; totalPages: number };
    unreadCount: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      institutionId,
      userId: currentUserId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { message: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.createdFrom || query.createdTo
        ? {
            createdAt: {
              ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
              ...(query.createdTo ? { lte: new Date(query.createdTo) } : {}),
            },
          }
        : {}),
    };

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          institutionId,
          userId: currentUserId,
          status: NotificationStatus.UNREAD,
        },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  async findOne(
    institutionId: string,
    notificationId: string,
    currentUserId: string,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        institutionId,
        userId: currentUserId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAsRead(
    institutionId: string,
    notificationId: string,
    currentUserId: string,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        institutionId,
        userId: currentUserId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.status === NotificationStatus.READ) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(
    institutionId: string,
    currentUserId: string,
  ): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        institutionId,
        userId: currentUserId,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  async delete(
    institutionId: string,
    notificationId: string,
    currentUserId: string,
  ): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        institutionId,
        userId: currentUserId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  async deleteAll(
    institutionId: string,
    currentUserId: string,
  ): Promise<{ count: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        institutionId,
        userId: currentUserId,
      },
    });

    return { count: result.count };
  }
}
