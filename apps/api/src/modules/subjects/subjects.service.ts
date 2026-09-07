import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { ListSubjectsQueryDto } from './dto/list-subjects-query.dto';
import { Subject, SubjectStatus, Prisma } from '@prisma/client';

@Injectable()
export class SubjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateSubjectDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Subject> {
    const existing = await this.prisma.subject.findUnique({
      where: {
        institutionId_code: {
          institutionId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Subject with this code already exists in this institution');
    }

    if (dto.areaId) {
      await this.assertAreaBelongsToInstitution(institutionId, dto.areaId);
    }

    const subject = await this.prisma.subject.create({
      data: {
        institutionId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        areaId: dto.areaId,
        subjectType: dto.subjectType ?? 'OBLIGATORIA',
        minimumLevel: dto.minimumLevel,
        maximumLevel: dto.maximumLevel,
        status: dto.status,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'SUBJECT_CREATED',
      entityType: 'Subject',
      entityId: subject.id,
      newValues: {
        code: subject.code,
        name: subject.name,
        description: subject.description,
        areaId: subject.areaId,
        subjectType: subject.subjectType,
        minimumLevel: subject.minimumLevel,
        maximumLevel: subject.maximumLevel,
        status: subject.status,
      },
      ipAddress,
    });

    return subject;
  }

  async findAll(
    institutionId: string,
    query: ListSubjectsQueryDto,
  ): Promise<{ data: Subject[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SubjectWhereInput = {
      institutionId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.areaId ? { areaId: query.areaId } : {}),
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
      this.prisma.subject.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subject.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(institutionId: string, subjectId: string): Promise<Subject> {
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        institutionId,
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  async update(
    institutionId: string,
    subjectId: string,
    dto: UpdateSubjectDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Subject> {
    const existing = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        institutionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Subject not found');
    }

    if (dto.code) {
      const duplicate = await this.prisma.subject.findFirst({
        where: {
          institutionId,
          code: dto.code,
          id: { not: subjectId },
        },
      });

      if (duplicate) {
        throw new ConflictException('Subject with this code already exists in this institution');
      }
    }

    if (dto.areaId !== undefined && dto.areaId !== null) {
      await this.assertAreaBelongsToInstitution(institutionId, dto.areaId);
    }

    const updateData: Prisma.SubjectUpdateInput = {};
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.areaId !== undefined) updateData.area = dto.areaId ? { connect: { id: dto.areaId } } : { disconnect: true };
    if (dto.subjectType !== undefined) updateData.subjectType = dto.subjectType;
    if (dto.minimumLevel !== undefined) updateData.minimumLevel = dto.minimumLevel;
    if (dto.maximumLevel !== undefined) updateData.maximumLevel = dto.maximumLevel;
    if (dto.status !== undefined) updateData.status = dto.status;

    const subject = await this.prisma.subject.update({
      where: { id: subjectId },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: dto.status && dto.status === SubjectStatus.INACTIVE
        ? 'SUBJECT_DEACTIVATED'
        : 'SUBJECT_UPDATED',
      entityType: 'Subject',
      entityId: subject.id,
      oldValues: {
        code: existing.code,
        name: existing.name,
        description: existing.description,
        areaId: existing.areaId,
        subjectType: existing.subjectType,
        minimumLevel: existing.minimumLevel,
        maximumLevel: existing.maximumLevel,
        status: existing.status,
      },
      newValues: {
        code: subject.code,
        name: subject.name,
        description: subject.description,
        areaId: subject.areaId,
        subjectType: subject.subjectType,
        minimumLevel: subject.minimumLevel,
        maximumLevel: subject.maximumLevel,
        status: subject.status,
      },
      ipAddress,
    });

    return subject;
  }

  async deactivate(
    institutionId: string,
    subjectId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<Subject> {
    return this.update(
      institutionId,
      subjectId,
      { status: SubjectStatus.INACTIVE },
      userId,
      ipAddress,
    );
  }

  private async assertAreaBelongsToInstitution(institutionId: string, areaId: string): Promise<void> {
    const area = await this.prisma.area.findFirst({ where: { id: areaId, institutionId } });
    if (!area) {
      throw new NotFoundException('Area not found in this institution');
    }
  }
}
