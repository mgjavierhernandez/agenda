import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto';
import { UpdateScheduleBlockDto } from './dto/update-schedule-block.dto';
import { ListScheduleBlocksQueryDto } from './dto/list-schedule-blocks-query.dto';
import { ScheduleBlock, ScheduleStatus, Prisma } from '@prisma/client';

@Injectable()
export class ScheduleBlocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private timeStringToDate(time: string): Date {
    const [h, m, s] = time.split(':');
    return new Date(1970, 0, 1, Number(h), Number(m), Number(s || '0'));
  }

  private validateTimeRange(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }
  }

  async create(
    institutionId: string,
    dto: CreateScheduleBlockDto,
    userId: string,
    ipAddress?: string,
  ): Promise<ScheduleBlock> {
    this.validateTimeRange(dto.startTime, dto.endTime);

    const existing = await this.prisma.scheduleBlock.findUnique({
      where: {
        institutionId_name_dayOfWeek: { institutionId, name: dto.name, dayOfWeek: dto.dayOfWeek },
      },
    });
    if (existing) {
      throw new ConflictException('Schedule block with this name already exists for this day');
    }

    const block = await this.prisma.scheduleBlock.create({
      data: {
        institutionId,
        name: dto.name,
        dayOfWeek: dto.dayOfWeek,
        startTime: this.timeStringToDate(dto.startTime),
        endTime: this.timeStringToDate(dto.endTime),
        status: dto.status,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'SCHEDULE_BLOCK_CREATED',
      entityType: 'ScheduleBlock',
      entityId: block.id,
      newValues: { name: block.name, dayOfWeek: block.dayOfWeek },
      ipAddress,
    });

    return block;
  }

  async findAll(
    institutionId: string,
    query: ListScheduleBlocksQueryDto,
  ): Promise<{
    data: ScheduleBlock[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ScheduleBlockWhereInput = {
      institutionId,
      ...(query.dayOfWeek ? { dayOfWeek: query.dayOfWeek } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.scheduleBlock.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.scheduleBlock.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(institutionId: string, id: string): Promise<ScheduleBlock> {
    const block = await this.prisma.scheduleBlock.findFirst({ where: { id, institutionId } });
    if (!block) {
      throw new NotFoundException('Schedule block not found');
    }
    return block;
  }

  async update(
    institutionId: string,
    id: string,
    dto: UpdateScheduleBlockDto,
    userId: string,
    ipAddress?: string,
  ): Promise<ScheduleBlock> {
    const existing = await this.prisma.scheduleBlock.findFirst({ where: { id, institutionId } });
    if (!existing) {
      throw new NotFoundException('Schedule block not found');
    }

    const newName = dto.name ?? existing.name;
    const newDay = dto.dayOfWeek ?? existing.dayOfWeek;
    if (dto.name !== undefined || dto.dayOfWeek !== undefined) {
      const duplicate = await this.prisma.scheduleBlock.findFirst({
        where: { institutionId, name: newName, dayOfWeek: newDay, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException('Schedule block with this name already exists for this day');
      }
    }

    if (dto.startTime !== undefined || dto.endTime !== undefined) {
      const toStr = (d: Date) => {
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
      };
      const start = dto.startTime ?? toStr(existing.startTime);
      const end = dto.endTime ?? toStr(existing.endTime);
      this.validateTimeRange(start, end);
    }

    const updateData: Prisma.ScheduleBlockUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.dayOfWeek !== undefined) updateData.dayOfWeek = dto.dayOfWeek;
    if (dto.startTime !== undefined) updateData.startTime = this.timeStringToDate(dto.startTime);
    if (dto.endTime !== undefined) updateData.endTime = this.timeStringToDate(dto.endTime);
    if (dto.status !== undefined) updateData.status = dto.status;

    const block = await this.prisma.scheduleBlock.update({ where: { id }, data: updateData });

    await this.auditService.log({
      userId,
      institutionId,
      action:
        dto.status && dto.status === ScheduleStatus.INACTIVE
          ? 'SCHEDULE_BLOCK_DEACTIVATED'
          : 'SCHEDULE_BLOCK_UPDATED',
      entityType: 'ScheduleBlock',
      entityId: block.id,
      oldValues: { name: existing.name, dayOfWeek: existing.dayOfWeek, status: existing.status },
      newValues: { name: block.name, dayOfWeek: block.dayOfWeek, status: block.status },
      ipAddress,
    });

    return block;
  }

  async deactivate(
    institutionId: string,
    id: string,
    userId: string,
    ipAddress?: string,
  ): Promise<ScheduleBlock> {
    return this.update(institutionId, id, { status: ScheduleStatus.INACTIVE }, userId, ipAddress);
  }
}
