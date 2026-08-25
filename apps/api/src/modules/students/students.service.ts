import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { Student, StudentStatus, Prisma } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateStudentDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Student> {
    const existing = await this.prisma.student.findUnique({
      where: {
        institutionId_documentType_documentNumber: {
          institutionId,
          documentType: dto.documentType,
          documentNumber: dto.documentNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Student with this document already exists in this institution');
    }

    const student = await this.prisma.student.create({
      data: {
        institutionId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_CREATED',
      entityType: 'Student',
      entityId: student.id,
      newValues: {
        firstName: student.firstName,
        lastName: student.lastName,
        documentType: student.documentType,
        documentNumber: student.documentNumber,
      },
      ipAddress,
    });

    return student;
  }

  async findAll(
    institutionId: string,
    query: ListStudentsQueryDto,
  ): Promise<{ data: Student[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentWhereInput = {
      institutionId,
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { documentNumber: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.student.count({ where }),
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

  async findOne(institutionId: string, studentId: string): Promise<Student> {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        institutionId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async update(
    institutionId: string,
    studentId: string,
    dto: UpdateStudentDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Student> {
    const existing = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        institutionId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Student not found');
    }

    if (dto.documentType || dto.documentNumber) {
      const newDocumentType = dto.documentType ?? existing.documentType;
      const newDocumentNumber = dto.documentNumber ?? existing.documentNumber;

      const duplicate = await this.prisma.student.findFirst({
        where: {
          institutionId,
          documentType: newDocumentType,
          documentNumber: newDocumentNumber,
          id: { not: studentId },
        },
      });

      if (duplicate) {
        throw new ConflictException('Student with this document already exists in this institution');
      }
    }

    const updateData: Prisma.StudentUpdateInput = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.documentType !== undefined) updateData.documentType = dto.documentType;
    if (dto.documentNumber !== undefined) updateData.documentNumber = dto.documentNumber;
    if (dto.dateOfBirth !== undefined) {
      updateData.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    }
    if (dto.status !== undefined) updateData.status = dto.status;

    const student = await this.prisma.student.update({
      where: { id: studentId },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: dto.status && dto.status === StudentStatus.INACTIVE
        ? 'STUDENT_DEACTIVATED'
        : 'STUDENT_UPDATED',
      entityType: 'Student',
      entityId: student.id,
      oldValues: {
        firstName: existing.firstName,
        lastName: existing.lastName,
        documentType: existing.documentType,
        documentNumber: existing.documentNumber,
        status: existing.status,
      },
      newValues: {
        firstName: student.firstName,
        lastName: student.lastName,
        documentType: student.documentType,
        documentNumber: student.documentNumber,
        status: student.status,
      },
      ipAddress,
    });

    return student;
  }

  async deactivate(
    institutionId: string,
    studentId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<Student> {
    return this.update(
      institutionId,
      studentId,
      { status: StudentStatus.INACTIVE },
      userId,
      ipAddress,
    );
  }
}
