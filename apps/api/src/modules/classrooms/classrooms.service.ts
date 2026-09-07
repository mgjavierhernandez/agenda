import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateClassroomDto, UpdateClassroomDto, ListClassroomsQueryDto } from './dto/classroom.dto';
import { Classroom, ScheduleStatus, Prisma } from '@prisma/client';

@Injectable()
export class ClassroomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateClassroomDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Classroom> {
    const existing = await this.prisma.classroom.findUnique({
      where: { institutionId_code: { institutionId, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException('Classroom with this code already exists in this institution');
    }

    const classroom = await this.prisma.classroom.create({
      data: {
        institutionId,
        code: dto.code,
        name: dto.name,
        capacity: dto.capacity,
        type: dto.type,
        status: dto.status,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'CLASSROOM_CREATED',
      entityType: 'Classroom',
      entityId: classroom.id,
      newValues: { code: classroom.code, name: classroom.name, type: classroom.type },
      ipAddress,
    });

    return classroom;
  }

  async findAll(
    institutionId: string,
    query: ListClassroomsQueryDto,
  ): Promise<{ data: Classroom[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ClassroomWhereInput = {
      institutionId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.classroom.findMany({ where, skip, take: limit, orderBy: { code: 'asc' } }),
      this.prisma.classroom.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(institutionId: string, id: string): Promise<Classroom> {
    const classroom = await this.prisma.classroom.findFirst({ where: { id, institutionId } });
    if (!classroom) {
      throw new NotFoundException('Classroom not found');
    }
    return classroom;
  }

  async update(
    institutionId: string,
    id: string,
    dto: UpdateClassroomDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Classroom> {
    const existing = await this.prisma.classroom.findFirst({ where: { id, institutionId } });
    if (!existing) {
      throw new NotFoundException('Classroom not found');
    }

    if (dto.code) {
      const duplicate = await this.prisma.classroom.findFirst({
        where: { institutionId, code: dto.code, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException('Classroom with this code already exists in this institution');
      }
    }

    const updateData: Prisma.ClassroomUpdateInput = {};
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.capacity !== undefined) updateData.capacity = dto.capacity;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.status !== undefined) updateData.status = dto.status;

    const classroom = await this.prisma.classroom.update({ where: { id }, data: updateData });

    await this.auditService.log({
      userId,
      institutionId,
      action: dto.status && dto.status === ScheduleStatus.INACTIVE ? 'CLASSROOM_DEACTIVATED' : 'CLASSROOM_UPDATED',
      entityType: 'Classroom',
      entityId: classroom.id,
      oldValues: { code: existing.code, name: existing.name, status: existing.status },
      newValues: { code: classroom.code, name: classroom.name, status: classroom.status },
      ipAddress,
    });

    return classroom;
  }

  async deactivate(
    institutionId: string,
    id: string,
    userId: string,
    ipAddress?: string,
  ): Promise<Classroom> {
    return this.update(institutionId, id, { status: ScheduleStatus.INACTIVE }, userId, ipAddress);
  }
}
