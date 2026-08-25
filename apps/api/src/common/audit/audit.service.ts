import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { Prisma } from '@prisma/client';

export interface AuditEvent {
  userId?: string;
  institutionId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(event: AuditEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: event.userId ?? undefined,
        institutionId: event.institutionId ?? undefined,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId ?? undefined,
        oldValues: event.oldValues
          ? (event.oldValues as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        newValues: event.newValues
          ? (event.newValues as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        ipAddress: event.ipAddress ?? undefined,
      },
    });
  }
}
