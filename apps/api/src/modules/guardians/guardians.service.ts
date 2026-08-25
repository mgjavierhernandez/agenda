import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { LinkGuardianDto } from './dto/link-guardian.dto';
import { ListGuardiansQueryDto } from './dto/list-guardians-query.dto';
import { GuardianStudent, Student, Prisma } from '@prisma/client';

@Injectable()
export class GuardiansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async linkStudent(
    institutionId: string,
    guardianUserId: string,
    dto: LinkGuardianDto,
    performingUserId: string,
    ipAddress?: string,
  ): Promise<GuardianStudent> {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, institutionId },
    });
    if (!student) {
      throw new NotFoundException('Student not found in this institution');
    }

    const guardianMembership = await this.prisma.userInstitution.findFirst({
      where: { userId: guardianUserId, institutionId, status: 'ACTIVE' },
    });
    if (!guardianMembership) {
      throw new ForbiddenException('Guardian user does not belong to this institution');
    }

    const existing = await this.prisma.guardianStudent.findUnique({
      where: { institutionId_guardianUserId_studentId: { institutionId, guardianUserId, studentId: dto.studentId } },
    });
    if (existing) {
      throw new ConflictException('Guardian is already linked to this student');
    }

    const guardianStudent = await this.prisma.guardianStudent.create({
      data: {
        institutionId,
        guardianUserId,
        studentId: dto.studentId,
        relationshipType: dto.relationshipType,
        isPrimary: dto.isPrimary ?? false,
      },
    });

    await this.auditService.log({
      userId: performingUserId,
      institutionId,
      action: 'GUARDIAN_LINKED',
      entityType: 'GuardianStudent',
      entityId: guardianStudent.id,
      newValues: {
        guardianUserId,
        studentId: dto.studentId,
        relationshipType: dto.relationshipType,
        isPrimary: guardianStudent.isPrimary,
      },
      ipAddress,
    });

    return guardianStudent;
  }

  async findStudentsByGuardian(
    institutionId: string,
    guardianUserId: string,
    query: ListGuardiansQueryDto,
  ): Promise<{ data: (GuardianStudent & { student: Student })[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.GuardianStudentWhereInput = {
      institutionId,
      guardianUserId,
      status: 'ACTIVE',
      ...(query.search
        ? {
            student: {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.guardianStudent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { student: true },
      }),
      this.prisma.guardianStudent.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByStudent(
    institutionId: string,
    studentId: string,
  ): Promise<GuardianStudent[]> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, institutionId },
    });
    if (!student) {
      throw new NotFoundException('Student not found in this institution');
    }

    return this.prisma.guardianStudent.findMany({
      where: { institutionId, studentId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async unlinkStudent(
    institutionId: string,
    guardianUserId: string,
    studentId: string,
    performingUserId: string,
    ipAddress?: string,
  ): Promise<GuardianStudent> {
    const guardianStudent = await this.prisma.guardianStudent.findUnique({
      where: { institutionId_guardianUserId_studentId: { institutionId, guardianUserId, studentId } },
    });

    if (!guardianStudent) {
      throw new NotFoundException('Guardian-student link not found');
    }

    if (guardianStudent.status === 'INACTIVE') {
      throw new ConflictException('Guardian-student link is already inactive');
    }

    const updated = await this.prisma.guardianStudent.update({
      where: { id: guardianStudent.id },
      data: { status: 'INACTIVE' },
    });

    await this.auditService.log({
      userId: performingUserId,
      institutionId,
      action: 'GUARDIAN_UNLINKED',
      entityType: 'GuardianStudent',
      entityId: guardianStudent.id,
      oldValues: { status: guardianStudent.status },
      newValues: { status: 'INACTIVE' },
      ipAddress,
    });

    return updated;
  }
}
