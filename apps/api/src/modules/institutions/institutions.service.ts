import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateInstitutionDto, UpdateInstitutionDto, ListInstitutionsQueryDto } from './dto/institution.dto';
import { Institution, InstitutionStatus, Prisma } from '@prisma/client';

@Injectable()
export class InstitutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreateInstitutionDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Institution> {
    const existing = await this.prisma.institution.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Institution with this slug already exists');
    }

    const institution = await this.prisma.institution.create({
      data: {
        name: dto.name,
        slug: dto.slug,
      },
    });

    await this.auditService.log({
      userId,
      action: 'INSTITUTION_CREATED',
      entityType: 'Institution',
      entityId: institution.id,
      newValues: { name: institution.name, slug: institution.slug },
      ipAddress,
    });

    return institution;
  }

  async findAll(
    query: ListInstitutionsQueryDto,
  ): Promise<{ data: Institution[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InstitutionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.institution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.institution.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, tenantId?: string): Promise<Institution> {
    // When a tenant context is present (e.g. INSTITUTION_ADMIN), the target
    // institution must be the caller's own institution (IDOR protection).
    if (tenantId && id !== tenantId) {
      throw new NotFoundException('Institution not found');
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id },
    });
    if (!institution) {
      throw new NotFoundException('Institution not found');
    }
    return institution;
  }

  async update(
    id: string,
    dto: UpdateInstitutionDto,
    userId: string,
    tenantId?: string,
    ipAddress?: string,
  ): Promise<Institution> {
    const existing = await this.findOne(id, tenantId);

    if (existing.status === InstitutionStatus.INACTIVE && dto.status !== InstitutionStatus.ACTIVE) {
      throw new BadRequestException('Cannot modify an inactive institution');
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.prisma.institution.findUnique({
        where: { slug: dto.slug },
      });
      if (slugExists) {
        throw new ConflictException('Slug already in use');
      }
    }

    const institution = await this.prisma.institution.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    await this.auditService.log({
      userId,
      action: 'INSTITUTION_UPDATED',
      entityType: 'Institution',
      entityId: institution.id,
      oldValues: { name: existing.name, slug: existing.slug, status: existing.status },
      newValues: { name: institution.name, slug: institution.slug, status: institution.status },
      ipAddress,
    });

    return institution;
  }

  async deactivate(
    id: string,
    userId: string,
    tenantId?: string,
    ipAddress?: string,
  ): Promise<Institution> {
    const existing = await this.findOne(id, tenantId);

    if (existing.status === InstitutionStatus.INACTIVE) {
      return existing;
    }

    const institution = await this.prisma.institution.update({
      where: { id },
      data: { status: InstitutionStatus.INACTIVE },
    });

    await this.auditService.log({
      userId,
      action: 'INSTITUTION_DEACTIVATED',
      entityType: 'Institution',
      entityId: institution.id,
      oldValues: { status: existing.status },
      newValues: { status: institution.status },
      ipAddress,
    });

    return institution;
  }
}
