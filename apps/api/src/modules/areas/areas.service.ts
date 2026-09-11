import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { ListAreasQueryDto } from './dto/list-areas-query.dto';
import { Area, SubjectStatus, Prisma } from '@prisma/client';

@Injectable()
export class AreasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateAreaDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Area> {
    const existing = await this.prisma.area.findUnique({
      where: { institutionId_code: { institutionId, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException('Area with this code already exists in this institution');
    }
    const area = await this.prisma.area.create({
      data: {
        institutionId,
        name: dto.name,
        code: dto.code,
        isOfficial: dto.isOfficial ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.auditService.log({
      userId,
      institutionId,
      action: 'AREA_CREATED',
      entityType: 'Area',
      entityId: area.id,
      newValues: {
        name: area.name,
        code: area.code,
        isOfficial: area.isOfficial,
        sortOrder: area.sortOrder,
      },
      ipAddress,
    });
    return area;
  }

  async findAll(
    institutionId: string,
    query: ListAreasQueryDto,
  ): Promise<{
    data: Area[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.AreaWhereInput = {
      institutionId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.area.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.area.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(institutionId: string, id: string): Promise<Area> {
    const area = await this.prisma.area.findFirst({ where: { id, institutionId } });
    if (!area) throw new NotFoundException('Area not found');
    return area;
  }

  async update(
    institutionId: string,
    id: string,
    dto: UpdateAreaDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Area> {
    const existing = await this.prisma.area.findFirst({ where: { id, institutionId } });
    if (!existing) throw new NotFoundException('Area not found');
    if (dto.code) {
      const duplicate = await this.prisma.area.findFirst({
        where: { institutionId, code: dto.code, id: { not: id } },
      });
      if (duplicate)
        throw new ConflictException('Area with this code already exists in this institution');
    }
    const updateData: Prisma.AreaUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.isOfficial !== undefined) updateData.isOfficial = dto.isOfficial;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) updateData.status = dto.status;
    const area = await this.prisma.area.update({ where: { id }, data: updateData });
    await this.auditService.log({
      userId,
      institutionId,
      action:
        dto.status && dto.status === SubjectStatus.INACTIVE ? 'AREA_DEACTIVATED' : 'AREA_UPDATED',
      entityType: 'Area',
      entityId: area.id,
      oldValues: {
        name: existing.name,
        code: existing.code,
        isOfficial: existing.isOfficial,
        sortOrder: existing.sortOrder,
        status: existing.status,
      },
      newValues: {
        name: area.name,
        code: area.code,
        isOfficial: area.isOfficial,
        sortOrder: area.sortOrder,
        status: area.status,
      },
      ipAddress,
    });
    return area;
  }

  async deactivate(
    institutionId: string,
    id: string,
    userId: string,
    ipAddress?: string,
  ): Promise<Area> {
    return this.update(institutionId, id, { status: SubjectStatus.INACTIVE }, userId, ipAddress);
  }
}
