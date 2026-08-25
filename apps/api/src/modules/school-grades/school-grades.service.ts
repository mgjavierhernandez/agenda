import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateSchoolGradeDto } from './dto/create-school-grade.dto';
import { UpdateSchoolGradeDto } from './dto/update-school-grade.dto';
import { ListSchoolGradesQueryDto } from './dto/list-school-grades-query.dto';
import { SchoolGrade, SchoolGradeStatus, Prisma } from '@prisma/client';

@Injectable()
export class SchoolGradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(institutionId: string, dto: CreateSchoolGradeDto, userId: string, ipAddress?: string): Promise<SchoolGrade> {
    const existing = await this.prisma.schoolGrade.findUnique({
      where: { institutionId_code: { institutionId, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException('School grade with this code already exists in this institution');
    }
    const schoolGrade = await this.prisma.schoolGrade.create({
      data: { institutionId, name: dto.name, code: dto.code, sortOrder: dto.sortOrder ?? 0 },
    });
    await this.auditService.log({
      userId, institutionId, action: 'SCHOOL_GRADE_CREATED', entityType: 'SchoolGrade',
      entityId: schoolGrade.id,
      newValues: { name: schoolGrade.name, code: schoolGrade.code, sortOrder: schoolGrade.sortOrder },
      ipAddress,
    });
    return schoolGrade;
  }

  async findAll(institutionId: string, query: ListSchoolGradesQueryDto): Promise<{ data: SchoolGrade[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.SchoolGradeWhereInput = {
      institutionId,
      ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { code: { contains: query.search, mode: 'insensitive' } }] } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.schoolGrade.findMany({ where, skip, take: limit, orderBy: { sortOrder: 'asc' } }),
      this.prisma.schoolGrade.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(institutionId: string, id: string): Promise<SchoolGrade> {
    const schoolGrade = await this.prisma.schoolGrade.findFirst({ where: { id, institutionId } });
    if (!schoolGrade) throw new NotFoundException('School grade not found');
    return schoolGrade;
  }

  async update(institutionId: string, id: string, dto: UpdateSchoolGradeDto, userId: string, ipAddress?: string): Promise<SchoolGrade> {
    const existing = await this.prisma.schoolGrade.findFirst({ where: { id, institutionId } });
    if (!existing) throw new NotFoundException('School grade not found');
    if (dto.code) {
      const duplicate = await this.prisma.schoolGrade.findFirst({ where: { institutionId, code: dto.code, id: { not: id } } });
      if (duplicate) throw new ConflictException('School grade with this code already exists in this institution');
    }
    const updateData: Prisma.SchoolGradeUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) updateData.status = dto.status;
    const schoolGrade = await this.prisma.schoolGrade.update({ where: { id }, data: updateData });
    await this.auditService.log({
      userId, institutionId,
      action: dto.status && dto.status === SchoolGradeStatus.INACTIVE ? 'SCHOOL_GRADE_DEACTIVATED' : 'SCHOOL_GRADE_UPDATED',
      entityType: 'SchoolGrade', entityId: schoolGrade.id,
      oldValues: { name: existing.name, code: existing.code, sortOrder: existing.sortOrder, status: existing.status },
      newValues: { name: schoolGrade.name, code: schoolGrade.code, sortOrder: schoolGrade.sortOrder, status: schoolGrade.status },
      ipAddress,
    });
    return schoolGrade;
  }

  async deactivate(institutionId: string, id: string, userId: string, ipAddress?: string): Promise<SchoolGrade> {
    return this.update(institutionId, id, { status: SchoolGradeStatus.INACTIVE }, userId, ipAddress);
  }
}
