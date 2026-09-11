import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateFollowUpCategoryDto } from './dto/create-follow-up-category.dto';
import { UpdateFollowUpCategoryDto } from './dto/update-follow-up-category.dto';
import { FollowUpCategory, Prisma } from '@prisma/client';

@Injectable()
export class FollowUpCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateFollowUpCategoryDto,
    userId: string,
    ipAddress?: string,
  ): Promise<FollowUpCategory> {
    const name = dto.name.trim();

    const existing = await this.prisma.followUpCategory.findFirst({
      where: { institutionId, name },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A category with this name already exists in this institution');
    }

    const category = await this.prisma.followUpCategory.create({
      data: {
        institutionId,
        name,
        description: dto.description?.trim() ?? null,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_CATEGORY_CREATED',
      entityType: 'FollowUpCategory',
      entityId: category.id,
      newValues: {
        name: category.name,
        description: category.description,
      },
      ipAddress,
    });

    return category;
  }

  async findAll(institutionId: string): Promise<FollowUpCategory[]> {
    return this.prisma.followUpCategory.findMany({
      where: { institutionId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(institutionId: string, categoryId: string): Promise<FollowUpCategory> {
    const category = await this.prisma.followUpCategory.findFirst({
      where: { id: categoryId, institutionId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(
    institutionId: string,
    categoryId: string,
    dto: UpdateFollowUpCategoryDto,
    userId: string,
    ipAddress?: string,
  ): Promise<FollowUpCategory> {
    const existing = await this.prisma.followUpCategory.findFirst({
      where: { id: categoryId, institutionId },
    });

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    if (dto.name !== undefined && dto.name.trim() !== existing.name) {
      const name = dto.name.trim();
      const duplicate = await this.prisma.followUpCategory.findFirst({
        where: { institutionId, name, id: { not: categoryId } },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException('A category with this name already exists in this institution');
      }
    }

    const updateData: Prisma.FollowUpCategoryUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description?.trim() ?? null;
    if (dto.active !== undefined) updateData.active = dto.active;

    const category = await this.prisma.followUpCategory.update({
      where: { id: categoryId },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_CATEGORY_UPDATED',
      entityType: 'FollowUpCategory',
      entityId: category.id,
      oldValues: {
        name: existing.name,
        description: existing.description,
        active: existing.active,
      },
      newValues: {
        name: category.name,
        description: category.description,
        active: category.active,
      },
      ipAddress,
    });

    return category;
  }

  async remove(
    institutionId: string,
    categoryId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<{ success: boolean }> {
    const existing = await this.prisma.followUpCategory.findFirst({
      where: { id: categoryId, institutionId },
    });

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    const usageCount = await this.prisma.studentFollowUp.count({
      where: { categoryId },
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete category "${existing.name}" because it is used by ${usageCount} follow-up(s). Deactivate it instead.`,
      );
    }

    await this.prisma.followUpCategory.delete({
      where: { id: categoryId },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_CATEGORY_DELETED',
      entityType: 'FollowUpCategory',
      entityId: categoryId,
      oldValues: {
        name: existing.name,
        description: existing.description,
        active: existing.active,
      },
      ipAddress,
    });

    return { success: true };
  }
}
