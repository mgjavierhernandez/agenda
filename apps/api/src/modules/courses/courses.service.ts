import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ListCoursesQueryDto } from './dto/list-courses-query.dto';
import { Course, CourseStatus, Prisma } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateCourseDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Course> {
    const existing = await this.prisma.course.findUnique({
      where: {
        institutionId_code: {
          institutionId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Course with this code already exists in this institution');
    }

    const course = await this.prisma.course.create({
      data: {
        institutionId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        status: dto.status,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'COURSE_CREATED',
      entityType: 'Course',
      entityId: course.id,
      newValues: {
        code: course.code,
        name: course.name,
        description: course.description,
        status: course.status,
      },
      ipAddress,
    });

    return course;
  }

  async findAll(
    institutionId: string,
    query: ListCoursesQueryDto,
  ): Promise<{ data: Course[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {
      institutionId,
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
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where }),
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

  async findOne(institutionId: string, courseId: string): Promise<Course> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        institutionId,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async update(
    institutionId: string,
    courseId: string,
    dto: UpdateCourseDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Course> {
    const existing = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        institutionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Course not found');
    }

    if (dto.code) {
      const duplicate = await this.prisma.course.findFirst({
        where: {
          institutionId,
          code: dto.code,
          id: { not: courseId },
        },
      });

      if (duplicate) {
        throw new ConflictException('Course with this code already exists in this institution');
      }
    }

    const updateData: Prisma.CourseUpdateInput = {};
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;

    const course = await this.prisma.course.update({
      where: { id: courseId },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: dto.status && dto.status === CourseStatus.INACTIVE
        ? 'COURSE_DEACTIVATED'
        : 'COURSE_UPDATED',
      entityType: 'Course',
      entityId: course.id,
      oldValues: {
        code: existing.code,
        name: existing.name,
        description: existing.description,
        status: existing.status,
      },
      newValues: {
        code: course.code,
        name: course.name,
        description: course.description,
        status: course.status,
      },
      ipAddress,
    });

    return course;
  }

  async deactivate(
    institutionId: string,
    courseId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<Course> {
    return this.update(
      institutionId,
      courseId,
      { status: CourseStatus.INACTIVE },
      userId,
      ipAddress,
    );
  }
}
