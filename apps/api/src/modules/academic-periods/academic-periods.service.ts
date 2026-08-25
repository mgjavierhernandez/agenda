import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateAcademicPeriodDto } from './dto/create-academic-period.dto';
import { UpdateAcademicPeriodDto } from './dto/update-academic-period.dto';
import { ListAcademicPeriodsQueryDto } from './dto/list-academic-periods-query.dto';
import { AcademicPeriod, AcademicPeriodStatus, Prisma } from '@prisma/client';

@Injectable()
export class AcademicPeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateAcademicPeriodDto,
    userId: string,
    ipAddress?: string,
  ): Promise<AcademicPeriod> {
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    const existing = await this.prisma.academicPeriod.findFirst({
      where: {
        institutionId,
        code: dto.code,
      },
    });

    if (existing) {
      throw new ConflictException('Academic period with this code already exists in this institution');
    }

    const academicPeriod = await this.prisma.academicPeriod.create({
      data: {
        institutionId,
        name: dto.name,
        code: dto.code,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'ACADEMIC_PERIOD_CREATED',
      entityType: 'AcademicPeriod',
      entityId: academicPeriod.id,
      newValues: {
        name: academicPeriod.name,
        code: academicPeriod.code,
        startDate: academicPeriod.startDate,
        endDate: academicPeriod.endDate,
      },
      ipAddress,
    });

    return academicPeriod;
  }

  async findAll(
    institutionId: string,
    query: ListAcademicPeriodsQueryDto,
  ): Promise<{ data: AcademicPeriod[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AcademicPeriodWhereInput = {
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
      this.prisma.academicPeriod.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.academicPeriod.count({ where }),
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

  async findOne(institutionId: string, academicPeriodId: string): Promise<AcademicPeriod> {
    const academicPeriod = await this.prisma.academicPeriod.findFirst({
      where: {
        id: academicPeriodId,
        institutionId,
      },
    });

    if (!academicPeriod) {
      throw new NotFoundException('Academic period not found');
    }

    return academicPeriod;
  }

  async update(
    institutionId: string,
    academicPeriodId: string,
    dto: UpdateAcademicPeriodDto,
    userId: string,
    ipAddress?: string,
  ): Promise<AcademicPeriod> {
    const existing = await this.prisma.academicPeriod.findFirst({
      where: {
        id: academicPeriodId,
        institutionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Academic period not found');
    }

    if (dto.startDate && dto.endDate) {
      if (new Date(dto.startDate) >= new Date(dto.endDate)) {
        throw new BadRequestException('Start date must be before end date');
      }
    } else if (dto.startDate) {
      if (new Date(dto.startDate) >= existing.endDate) {
        throw new BadRequestException('Start date must be before end date');
      }
    } else if (dto.endDate) {
      if (existing.startDate >= new Date(dto.endDate)) {
        throw new BadRequestException('Start date must be before end date');
      }
    }

    if (dto.code) {
      const duplicate = await this.prisma.academicPeriod.findFirst({
        where: {
          institutionId,
          code: dto.code,
          id: { not: academicPeriodId },
        },
      });

      if (duplicate) {
        throw new ConflictException('Academic period with this code already exists in this institution');
      }
    }

    const updateData: Prisma.AcademicPeriodUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);
    if (dto.status !== undefined) updateData.status = dto.status;

    const academicPeriod = await this.prisma.academicPeriod.update({
      where: { id: academicPeriodId },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: dto.status && dto.status === AcademicPeriodStatus.INACTIVE
        ? 'ACADEMIC_PERIOD_DEACTIVATED'
        : 'ACADEMIC_PERIOD_UPDATED',
      entityType: 'AcademicPeriod',
      entityId: academicPeriod.id,
      oldValues: {
        name: existing.name,
        code: existing.code,
        startDate: existing.startDate,
        endDate: existing.endDate,
        status: existing.status,
      },
      newValues: {
        name: academicPeriod.name,
        code: academicPeriod.code,
        startDate: academicPeriod.startDate,
        endDate: academicPeriod.endDate,
        status: academicPeriod.status,
      },
      ipAddress,
    });

    return academicPeriod;
  }

  async deactivate(
    institutionId: string,
    academicPeriodId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<AcademicPeriod> {
    return this.update(
      institutionId,
      academicPeriodId,
      { status: AcademicPeriodStatus.INACTIVE },
      userId,
      ipAddress,
    );
  }
}
