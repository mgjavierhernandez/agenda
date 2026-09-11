import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CommunicationRecipientStatus, Prisma } from '@prisma/client';
import { ListRecipientsQueryDto } from './dto/communication-recipient.dto';

@Injectable()
export class CommunicationRecipientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async markAsRead(
    institutionId: string,
    id: string,
    userId: string,
    ipAddress?: string,
  ) {
    const recipient = await this.prisma.communicationRecipient.findFirst({
      where: { id, institutionId, userId },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');

    if (recipient.status === CommunicationRecipientStatus.READ) {
      return recipient;
    }

    const updated = await this.prisma.communicationRecipient.update({
      where: { id: recipient.id },
      data: {
        status: CommunicationRecipientStatus.READ,
        readAt: new Date(),
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'COMMUNICATION_READ',
      entityType: 'CommunicationRecipient',
      entityId: updated.id,
      oldValues: { status: recipient.status },
      newValues: { status: updated.status },
      ipAddress,
    });

    return updated;
  }

  /**
   * Trazabilidad de apertura desde el detalle de la comunicación: localiza la
   * fila recipient del propio usuario para esa comunicación y la marca leída.
   * Sin fila (p. ej. gestores) no hace nada. Abrir ≠ responder.
   */
  async markOpenedByCommunication(
    institutionId: string,
    communicationId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<{ opened: boolean }> {
    const recipient = await this.prisma.communicationRecipient.findFirst({
      where: { institutionId, communicationId, userId },
      select: { id: true, status: true },
    });
    if (!recipient) return { opened: false };
    await this.markAsRead(institutionId, recipient.id, userId, ipAddress);
    return { opened: true };
  }

  async findAll(
    institutionId: string,
    userId: string,
    query: ListRecipientsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    const where: Prisma.CommunicationRecipientWhereInput = {
      institutionId,
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.communicationRecipient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { communication: { select: { id: true, title: true, audience: true } } },
      }),
      this.prisma.communicationRecipient.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getUnreadCount(
    institutionId: string,
    userId: string,
  ): Promise<{ count: number }> {
    const count = await this.prisma.communicationRecipient.count({
      where: {
        institutionId,
        userId,
        status: CommunicationRecipientStatus.DELIVERED,
      },
    });
    return { count };
  }

  async markAllAsRead(
    institutionId: string,
    userId: string,
    ipAddress?: string,
  ) {
    const result = await this.prisma.communicationRecipient.updateMany({
      where: {
        institutionId,
        userId,
        status: CommunicationRecipientStatus.DELIVERED,
      },
      data: {
        status: CommunicationRecipientStatus.READ,
        readAt: new Date(),
      },
    });

    if (result.count > 0) {
      await this.auditService.log({
        userId,
        institutionId,
        action: 'COMMUNICATIONS_ALL_READ',
        entityType: 'CommunicationRecipient',
        entityId: userId,
        newValues: { count: result.count },
        ipAddress,
      });
    }

    return { updated: result.count };
  }
}
