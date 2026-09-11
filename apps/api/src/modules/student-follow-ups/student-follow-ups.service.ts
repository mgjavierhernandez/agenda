import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import {
  StudentFollowUpAuthorizationService,
} from '../../common/auth/student-follow-up-authorization';
import { CreateStudentFollowUpDto } from './dto/create-student-follow-up.dto';
import { UpdateStudentFollowUpDto } from './dto/update-student-follow-up.dto';
import { ListStudentFollowUpsQueryDto } from './dto/list-student-follow-ups-query.dto';
import { CreateFollowUpEntryDto } from './dto/create-follow-up-entry.dto';
import { UpdateFollowUpEntryDto } from './dto/update-follow-up-entry.dto';
import { CreateCommitmentDto } from './dto/create-commitment.dto';
import { UpdateCommitmentDto } from './dto/update-commitment.dto';
import { CreateFollowUpAttachmentDto } from './dto/create-follow-up-attachment.dto';
import {
  StudentFollowUp,
  FollowUpEntry,
  Commitment,
  FollowUpAttachment,
  FollowUpStatus,
  Prisma,
} from '@prisma/client';
import {
  sendFollowUpNotification,
  sendCommitmentNotification,
} from './follow-up-notification.helper';
import {
  deriveCommitmentStatus,
  deriveCommitmentStatuses,
} from './commitment-overdue.helper';

@Injectable()
export class StudentFollowUpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authorizationService: StudentFollowUpAuthorizationService,
  ) {}

  async create(
    institutionId: string,
    dto: CreateStudentFollowUpDto,
    userId: string,
    ipAddress?: string,
  ): Promise<StudentFollowUp> {
    const access = await this.authorizationService.canCreate(
      userId,
      institutionId,
      dto.studentId,
    );
    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      if (access.reason === 'NO_STUDENT_RELATIONSHIP') {
        throw new NotFoundException('Student not found');
      }
      throw new ForbiddenException('Insufficient permissions');
    }

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, institutionId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (dto.categoryId) {
      const category = await this.prisma.followUpCategory.findFirst({
        where: { id: dto.categoryId, institutionId, active: true },
        select: { id: true },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const followUp = await this.prisma.studentFollowUp.create({
      data: {
        institutionId,
        studentId: dto.studentId,
        createdById: userId,
        type: dto.type,
        severity: dto.severity ?? undefined,
        confidentiality: dto.confidentiality ?? undefined,
        categoryId: dto.categoryId ?? null,
        title: dto.title,
        summary: dto.summary ?? null,
        description: dto.description ?? null,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_CREATED',
      entityType: 'StudentFollowUp',
      entityId: followUp.id,
      newValues: {
        studentId: followUp.studentId,
        type: followUp.type,
        severity: followUp.severity,
        status: followUp.status,
        confidentiality: followUp.confidentiality,
        title: followUp.title,
      },
      ipAddress,
    });

    await sendFollowUpNotification(this.prisma, {
      institutionId,
      followUpId: followUp.id,
      studentId: followUp.studentId,
      confidentiality: followUp.confidentiality,
      actorUserId: userId,
    }, 'CREATED');

    return followUp;
  }

  async findAll(
    institutionId: string,
    query: ListStudentFollowUpsQueryDto,
    userId: string,
  ): Promise<{
    data: StudentFollowUp[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const role = await this.authorizationService['getUserRole'](userId, institutionId);
    if (!role) {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    if (role === 'SUPER_ADMIN') {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const visibleLevels =
      this.authorizationService.getVisibleConfidentialityLevels(role);

    // Un filtro explícito nunca puede ampliar los niveles visibles del rol
    // (evita ?confidentiality=INTERNAL para eludir la restricción).
    const requestedLevel = query.confidentiality;
    const confidentialityFilter =
      requestedLevel && (visibleLevels as string[]).includes(requestedLevel)
        ? requestedLevel
        : { in: visibleLevels };

    const where: Prisma.StudentFollowUpWhereInput = {
      institutionId,
      confidentiality: confidentialityFilter,
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.createdById ? { createdById: query.createdById } : {}),
      ...(query.createdFrom || query.createdTo
        ? {
            createdAt: {
              ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
              ...(query.createdTo ? { lte: new Date(query.createdTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { summary: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(role === 'TEACHER'
        ? {
            student: {
              enrollments: {
                some: {
                  course: {
                    teacherAssignments: {
                      some: { teacherUserId: userId, status: 'ACTIVE' },
                    },
                  },
                },
              },
            },
          }
        : {}),
      ...(role === 'PARENT'
        ? {
            student: {
              guardianStudents: {
                some: { guardianUserId: userId, status: 'ACTIVE' },
              },
            },
          }
        : {}),
      ...(role === 'STUDENT'
        ? {
            student: { user: { id: userId } },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.studentFollowUp.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          category: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.studentFollowUp.count({ where }),
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

  async findOne(
    institutionId: string,
    followUpId: string,
    userId: string,
  ): Promise<StudentFollowUp> {
    const access = await this.authorizationService.canRead(
      userId,
      institutionId,
      followUpId,
    );

    if (!access.allowed) {
      throw new NotFoundException('Follow-up not found');
    }

    const followUp = await this.prisma.studentFollowUp.findFirst({
      where: { id: followUpId, institutionId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        closedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }

    return followUp;
  }

  async update(
    institutionId: string,
    followUpId: string,
    dto: UpdateStudentFollowUpDto,
    userId: string,
    ipAddress?: string,
  ): Promise<StudentFollowUp> {
    const access = await this.authorizationService.canUpdate(
      userId,
      institutionId,
      followUpId,
    );

    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      if (access.reason === 'RECORD_CLOSED') {
        throw new BadRequestException('Cannot modify a closed follow-up record');
      }
      if (access.reason === 'NO_STUDENT_RELATIONSHIP') {
        throw new NotFoundException('Follow-up not found');
      }
      throw new ForbiddenException('Insufficient permissions');
    }

    const existing = await this.prisma.studentFollowUp.findFirst({
      where: { id: followUpId, institutionId },
    });

    if (!existing) {
      throw new NotFoundException('Follow-up not found');
    }

    if (dto.categoryId) {
      const category = await this.prisma.followUpCategory.findFirst({
        where: { id: dto.categoryId, institutionId, active: true },
        select: { id: true },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const updateData: Prisma.StudentFollowUpUpdateInput = {};
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.severity !== undefined) updateData.severity = dto.severity;
    if (dto.confidentiality !== undefined)
      updateData.confidentiality = dto.confidentiality;
    if (dto.categoryId !== undefined) {
      updateData.category = dto.categoryId
        ? { connect: { id: dto.categoryId } }
        : { disconnect: true };
    }
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.summary !== undefined) updateData.summary = dto.summary;
    if (dto.description !== undefined) updateData.description = dto.description;

    const followUp = await this.prisma.studentFollowUp.update({
      where: { id: followUpId },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_UPDATED',
      entityType: 'StudentFollowUp',
      entityId: followUp.id,
      oldValues: {
        type: existing.type,
        severity: existing.severity,
        status: existing.status,
        confidentiality: existing.confidentiality,
        title: existing.title,
      },
      newValues: {
        type: followUp.type,
        severity: followUp.severity,
        status: followUp.status,
        confidentiality: followUp.confidentiality,
        title: followUp.title,
      },
      ipAddress,
    });

    return followUp;
  }

  async close(
    institutionId: string,
    followUpId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<StudentFollowUp> {
    const access = await this.authorizationService.canClose(
      userId,
      institutionId,
      followUpId,
    );

    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      if (access.reason === 'ALREADY_CLOSED') {
        throw new BadRequestException('Follow-up record is already closed');
      }
      if (access.reason === 'NO_STUDENT_RELATIONSHIP') {
        throw new NotFoundException('Follow-up not found');
      }
      throw new ForbiddenException('Insufficient permissions');
    }

    const existing = await this.prisma.studentFollowUp.findFirst({
      where: { id: followUpId, institutionId },
    });

    if (!existing) {
      throw new NotFoundException('Follow-up not found');
    }

    if (existing.status === FollowUpStatus.CLOSED) {
      throw new BadRequestException('Follow-up record is already closed');
    }

    const now = new Date();
    const followUp = await this.prisma.studentFollowUp.update({
      where: { id: followUpId },
      data: {
        status: FollowUpStatus.CLOSED,
        closedById: userId,
        closedAt: now,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_CLOSED',
      entityType: 'StudentFollowUp',
      entityId: followUp.id,
      oldValues: {
        status: existing.status,
        closedById: existing.closedById,
        closedAt: existing.closedAt,
      },
      newValues: {
        status: followUp.status,
        closedById: followUp.closedById,
        closedAt: String(followUp.closedAt),
      },
      ipAddress,
    });

    await sendFollowUpNotification(this.prisma, {
      institutionId,
      followUpId: followUp.id,
      studentId: followUp.studentId,
      confidentiality: followUp.confidentiality,
      actorUserId: userId,
    }, 'CLOSED');

    return followUp;
  }

  // ============================================================
  // FOLLOW-UP ENTRIES
  // ============================================================

  private async getAndAuthorizeFollowUp(
    institutionId: string,
    followUpId: string,
    userId: string,
  ): Promise<StudentFollowUp> {
    const access = await this.authorizationService.canRead(
      userId,
      institutionId,
      followUpId,
    );
    if (!access.allowed) {
      throw new NotFoundException('Follow-up not found');
    }
    const followUp = await this.prisma.studentFollowUp.findFirst({
      where: { id: followUpId, institutionId },
    });
    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }
    return followUp;
  }

  private async assertFollowUpMutable(
    institutionId: string,
    followUpId: string,
    userId: string,
  ): Promise<StudentFollowUp> {
    const access = await this.authorizationService.canUpdate(
      userId,
      institutionId,
      followUpId,
    );
    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      if (access.reason === 'RECORD_CLOSED') {
        throw new BadRequestException('Cannot modify a closed follow-up record');
      }
      if (access.reason === 'NO_STUDENT_RELATIONSHIP') {
        throw new NotFoundException('Follow-up not found');
      }
      throw new ForbiddenException('Insufficient permissions');
    }
    const followUp = await this.prisma.studentFollowUp.findFirst({
      where: { id: followUpId, institutionId },
    });
    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }
    if (followUp.status === FollowUpStatus.CLOSED) {
      throw new BadRequestException('Cannot modify a closed follow-up record');
    }
    return followUp;
  }

  async createEntry(
    institutionId: string,
    followUpId: string,
    dto: CreateFollowUpEntryDto,
    userId: string,
    ipAddress?: string,
  ): Promise<FollowUpEntry> {
    const followUp = await this.assertFollowUpMutable(institutionId, followUpId, userId);

    const entry = await this.prisma.followUpEntry.create({
      data: {
        followUpId,
        createdById: userId,
        entryType: dto.entryType,
        content: dto.content,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_ENTRY_CREATED',
      entityType: 'FollowUpEntry',
      entityId: entry.id,
      newValues: {
        followUpId,
        entryType: entry.entryType,
        content: entry.content,
      },
      ipAddress,
    });

    await sendFollowUpNotification(this.prisma, {
      institutionId,
      followUpId: followUp.id,
      studentId: followUp.studentId,
      confidentiality: followUp.confidentiality,
      actorUserId: userId,
    }, 'ENTRY_CREATED');

    return entry;
  }

  async findEntries(
    institutionId: string,
    followUpId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: FollowUpEntry[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    await this.getAndAuthorizeFollowUp(institutionId, followUpId, userId);

    const skip = (page - 1) * limit;
    const where = { followUpId };

    const [data, total] = await Promise.all([
      this.prisma.followUpEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.followUpEntry.count({ where }),
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

  async findEntry(
    institutionId: string,
    followUpId: string,
    entryId: string,
    userId: string,
  ): Promise<FollowUpEntry> {
    await this.getAndAuthorizeFollowUp(institutionId, followUpId, userId);

    const entry = await this.prisma.followUpEntry.findFirst({
      where: { id: entryId, followUpId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Entry not found');
    }

    return entry;
  }

  async updateEntry(
    institutionId: string,
    followUpId: string,
    entryId: string,
    dto: UpdateFollowUpEntryDto,
    userId: string,
    ipAddress?: string,
  ): Promise<FollowUpEntry> {
    await this.assertFollowUpMutable(institutionId, followUpId, userId);

    const existing = await this.prisma.followUpEntry.findFirst({
      where: { id: entryId, followUpId },
    });

    if (!existing) {
      throw new NotFoundException('Entry not found');
    }

    const updateData: Prisma.FollowUpEntryUpdateInput = {};
    if (dto.entryType !== undefined) updateData.entryType = dto.entryType;
    if (dto.content !== undefined) updateData.content = dto.content;

    const entry = await this.prisma.followUpEntry.update({
      where: { id: entryId },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_ENTRY_UPDATED',
      entityType: 'FollowUpEntry',
      entityId: entry.id,
      oldValues: {
        entryType: existing.entryType,
        content: existing.content,
      },
      newValues: {
        entryType: entry.entryType,
        content: entry.content,
      },
      ipAddress,
    });

    return entry;
  }

  // ============================================================
  // COMMITMENTS
  // ============================================================

  async createCommitment(
    institutionId: string,
    followUpId: string,
    dto: CreateCommitmentDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Commitment> {
    const followUp = await this.assertFollowUpMutable(institutionId, followUpId, userId);

    const responsibleUser = await this.prisma.user.findFirst({
      where: { id: dto.responsibleUserId },
      select: { id: true },
    });
    if (!responsibleUser) {
      throw new NotFoundException('Responsible user not found');
    }

    const responsibleMembership = await this.prisma.userInstitution.findFirst({
      where: {
        userId: dto.responsibleUserId,
        institutionId,
        status: 'ACTIVE',
      },
    });
    if (!responsibleMembership) {
      throw new BadRequestException(
        'Responsible user is not a member of this institution',
      );
    }

    const commitment = await this.prisma.commitment.create({
      data: {
        followUpId,
        responsibleUserId: dto.responsibleUserId,
        responsibleRole: dto.responsibleRole,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_COMMITMENT_CREATED',
      entityType: 'Commitment',
      entityId: commitment.id,
      newValues: {
        followUpId,
        responsibleUserId: commitment.responsibleUserId,
        responsibleRole: commitment.responsibleRole,
        description: commitment.description,
        dueDate: commitment.dueDate,
      },
      ipAddress,
    });

    await sendCommitmentNotification(this.prisma, {
      institutionId,
      followUpId: followUp.id,
      studentId: followUp.studentId,
      confidentiality: followUp.confidentiality,
      actorUserId: userId,
    }, 'COMMITMENT_CREATED', dto.responsibleUserId);

    return commitment;
  }

  async findCommitments(
    institutionId: string,
    followUpId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: (Commitment & { effectiveStatus: string })[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    await this.getAndAuthorizeFollowUp(institutionId, followUpId, userId);

    const skip = (page - 1) * limit;
    const where = { followUpId };

    const [data, total] = await Promise.all([
      this.prisma.commitment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          responsibleUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.commitment.count({ where }),
    ]);

    return {
      data: deriveCommitmentStatuses(data),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findCommitment(
    institutionId: string,
    followUpId: string,
    commitmentId: string,
    userId: string,
  ): Promise<Commitment & { effectiveStatus: string }> {
    await this.getAndAuthorizeFollowUp(institutionId, followUpId, userId);

    const commitment = await this.prisma.commitment.findFirst({
      where: { id: commitmentId, followUpId },
      include: {
        responsibleUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!commitment) {
      throw new NotFoundException('Commitment not found');
    }

    return {
      ...commitment,
      effectiveStatus: deriveCommitmentStatus(commitment),
    };
  }

  async updateCommitment(
    institutionId: string,
    followUpId: string,
    commitmentId: string,
    dto: UpdateCommitmentDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Commitment> {
    const followUp = await this.assertFollowUpMutable(institutionId, followUpId, userId);

    const existing = await this.prisma.commitment.findFirst({
      where: { id: commitmentId, followUpId },
    });

    if (!existing) {
      throw new NotFoundException('Commitment not found');
    }

    if (dto.responsibleUserId) {
      const responsibleUser = await this.prisma.user.findFirst({
        where: { id: dto.responsibleUserId },
        select: { id: true },
      });
      if (!responsibleUser) {
        throw new NotFoundException('Responsible user not found');
      }

      const responsibleMembership = await this.prisma.userInstitution.findFirst({
        where: {
          userId: dto.responsibleUserId,
          institutionId,
          status: 'ACTIVE',
        },
      });
      if (!responsibleMembership) {
        throw new BadRequestException(
          'Responsible user is not a member of this institution',
        );
      }
    }

    const updateData: Prisma.CommitmentUpdateInput = {};
    if (dto.responsibleUserId !== undefined) {
      updateData.responsibleUser = { connect: { id: dto.responsibleUserId } };
    }
    if (dto.responsibleRole !== undefined) updateData.responsibleRole = dto.responsibleRole;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.dueDate !== undefined) {
      updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }

    const commitment = await this.prisma.commitment.update({
      where: { id: commitmentId },
      data: updateData,
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_COMMITMENT_UPDATED',
      entityType: 'Commitment',
      entityId: commitment.id,
      oldValues: {
        responsibleRole: existing.responsibleRole,
        description: existing.description,
        status: existing.status,
        dueDate: existing.dueDate,
      },
      newValues: {
        responsibleRole: commitment.responsibleRole,
        description: commitment.description,
        status: commitment.status,
        dueDate: commitment.dueDate,
      },
      ipAddress,
    });

    const action = dto.status === 'COMPLETED' ? 'COMMITMENT_COMPLETED' : 'COMMITMENT_UPDATED';
    await sendCommitmentNotification(this.prisma, {
      institutionId,
      followUpId: followUp.id,
      studentId: followUp.studentId,
      confidentiality: followUp.confidentiality,
      actorUserId: userId,
    }, action, commitment.responsibleUserId);

    return commitment;
  }

  // ============================================================
  // ATTACHMENTS
  // ============================================================

  async createAttachment(
    institutionId: string,
    followUpId: string,
    dto: CreateFollowUpAttachmentDto,
    userId: string,
    ipAddress?: string,
  ): Promise<FollowUpAttachment> {
    const followUp = await this.assertFollowUpMutable(institutionId, followUpId, userId);

    const fileAsset = await this.prisma.fileAsset.findFirst({
      where: { id: dto.fileAssetId, institutionId, status: 'ACTIVE' },
      select: { id: true, originalName: true },
    });
    if (!fileAsset) {
      throw new NotFoundException('File not found');
    }

    const existing = await this.prisma.followUpAttachment.findUnique({
      where: { followUpId_fileAssetId: { followUpId, fileAssetId: dto.fileAssetId } },
    });
    if (existing) {
      throw new BadRequestException('File is already attached to this follow-up');
    }

    const attachment = await this.prisma.followUpAttachment.create({
      data: {
        institutionId,
        followUpId,
        fileAssetId: dto.fileAssetId,
      },
      include: { fileAsset: true },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_ATTACHMENT_ADDED',
      entityType: 'FollowUpAttachment',
      entityId: attachment.id,
      newValues: {
        followUpId,
        fileAssetId: dto.fileAssetId,
        originalName: fileAsset.originalName,
      },
      ipAddress,
    });

    await sendFollowUpNotification(this.prisma, {
      institutionId,
      followUpId: followUp.id,
      studentId: followUp.studentId,
      confidentiality: followUp.confidentiality,
      actorUserId: userId,
    }, 'ATTACHMENT_ADDED');

    return attachment;
  }

  async findAttachments(
    institutionId: string,
    followUpId: string,
    userId: string,
  ): Promise<FollowUpAttachment[]> {
    await this.getAndAuthorizeFollowUp(institutionId, followUpId, userId);

    return this.prisma.followUpAttachment.findMany({
      where: { followUpId, institutionId },
      include: { fileAsset: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeAttachment(
    institutionId: string,
    followUpId: string,
    attachmentId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<{ success: boolean }> {
    await this.assertFollowUpMutable(institutionId, followUpId, userId);

    const attachment = await this.prisma.followUpAttachment.findFirst({
      where: { id: attachmentId, followUpId, institutionId },
      include: { fileAsset: true },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    await this.prisma.followUpAttachment.delete({
      where: { id: attachmentId },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_ATTACHMENT_REMOVED',
      entityType: 'FollowUpAttachment',
      entityId: attachmentId,
      oldValues: {
        followUpId,
        fileAssetId: attachment.fileAssetId,
        originalName: attachment.fileAsset.originalName,
      },
      ipAddress,
    });

    return { success: true };
  }

  // ============================================================
  // LIFECYCLE EXTENSIONS
  // ============================================================

  private VALID_TRANSITIONS: Record<string, string[]> = {
    OPEN: ['IN_PROGRESS', 'ESCALATED', 'CLOSED'],
    IN_PROGRESS: ['ESCALATED', 'PENDING_FOLLOW_UP', 'RESOLVED', 'CLOSED'],
    ESCALATED: ['IN_PROGRESS', 'PENDING_FOLLOW_UP', 'CLOSED'],
    PENDING_FOLLOW_UP: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  };

  private isValidTransition(from: string, to: string): boolean {
    const allowed = this.VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  async escalate(
    institutionId: string,
    followUpId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<StudentFollowUp> {
    const access = await this.authorizationService.canUpdate(
      userId,
      institutionId,
      followUpId,
    );
    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      if (access.reason === 'NO_STUDENT_RELATIONSHIP') {
        throw new NotFoundException('Follow-up not found');
      }
      throw new ForbiddenException('Insufficient permissions');
    }

    const existing = await this.prisma.studentFollowUp.findFirst({
      where: { id: followUpId, institutionId },
    });
    if (!existing) {
      throw new NotFoundException('Follow-up not found');
    }

    if (!this.isValidTransition(existing.status, FollowUpStatus.ESCALATED)) {
      throw new BadRequestException(
        `Cannot escalate from ${existing.status} status`,
      );
    }

    const followUp = await this.prisma.studentFollowUp.update({
      where: { id: followUpId },
      data: { status: FollowUpStatus.ESCALATED },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_ESCALATED',
      entityType: 'StudentFollowUp',
      entityId: followUp.id,
      oldValues: { status: existing.status },
      newValues: { status: followUp.status },
      ipAddress,
    });

    await sendFollowUpNotification(this.prisma, {
      institutionId,
      followUpId: followUp.id,
      studentId: followUp.studentId,
      confidentiality: followUp.confidentiality,
      actorUserId: userId,
    }, 'ESCALATED');

    return followUp;
  }

  async followUp(
    institutionId: string,
    followUpId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<StudentFollowUp> {
    const access = await this.authorizationService.canUpdate(
      userId,
      institutionId,
      followUpId,
    );
    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      if (access.reason === 'NO_STUDENT_RELATIONSHIP') {
        throw new NotFoundException('Follow-up not found');
      }
      throw new ForbiddenException('Insufficient permissions');
    }

    const existing = await this.prisma.studentFollowUp.findFirst({
      where: { id: followUpId, institutionId },
    });
    if (!existing) {
      throw new NotFoundException('Follow-up not found');
    }

    if (!this.isValidTransition(existing.status, FollowUpStatus.IN_PROGRESS)) {
      throw new BadRequestException(
        `Cannot transition to IN_PROGRESS from ${existing.status} status`,
      );
    }

    const followUp = await this.prisma.studentFollowUp.update({
      where: { id: followUpId },
      data: { status: FollowUpStatus.IN_PROGRESS },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_FOLLOW_UP',
      entityType: 'StudentFollowUp',
      entityId: followUp.id,
      oldValues: { status: existing.status },
      newValues: { status: followUp.status },
      ipAddress,
    });

    await sendFollowUpNotification(this.prisma, {
      institutionId,
      followUpId: followUp.id,
      studentId: followUp.studentId,
      confidentiality: followUp.confidentiality,
      actorUserId: userId,
    }, 'FOLLOW_UP');

    return followUp;
  }

  async resolve(
    institutionId: string,
    followUpId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<StudentFollowUp> {
    const access = await this.authorizationService.canUpdate(
      userId,
      institutionId,
      followUpId,
    );
    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      if (access.reason === 'NO_STUDENT_RELATIONSHIP') {
        throw new NotFoundException('Follow-up not found');
      }
      throw new ForbiddenException('Insufficient permissions');
    }

    const existing = await this.prisma.studentFollowUp.findFirst({
      where: { id: followUpId, institutionId },
    });
    if (!existing) {
      throw new NotFoundException('Follow-up not found');
    }

    if (!this.isValidTransition(existing.status, FollowUpStatus.RESOLVED)) {
      throw new BadRequestException(
        `Cannot resolve from ${existing.status} status`,
      );
    }

    const followUp = await this.prisma.studentFollowUp.update({
      where: { id: followUpId },
      data: { status: FollowUpStatus.RESOLVED },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_RESOLVED',
      entityType: 'StudentFollowUp',
      entityId: followUp.id,
      oldValues: { status: existing.status },
      newValues: { status: followUp.status },
      ipAddress,
    });

    await sendFollowUpNotification(this.prisma, {
      institutionId,
      followUpId: followUp.id,
      studentId: followUp.studentId,
      confidentiality: followUp.confidentiality,
      actorUserId: userId,
    }, 'RESOLVED');

    return followUp;
  }

  async reopen(
    institutionId: string,
    followUpId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<StudentFollowUp> {
    const access = await this.authorizationService.canManage(
      userId,
      institutionId,
    );
    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      throw new ForbiddenException('Insufficient permissions');
    }

    const existing = await this.prisma.studentFollowUp.findFirst({
      where: { id: followUpId, institutionId },
    });
    if (!existing) {
      throw new NotFoundException('Follow-up not found');
    }

    if (existing.status !== FollowUpStatus.CLOSED) {
      throw new BadRequestException('Only closed records can be reopened');
    }

    const followUp = await this.prisma.studentFollowUp.update({
      where: { id: followUpId },
      data: {
        status: FollowUpStatus.IN_PROGRESS,
        closedAt: null,
        closedById: null,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'STUDENT_FOLLOW_UP_REOPENED',
      entityType: 'StudentFollowUp',
      entityId: followUp.id,
      oldValues: {
        status: existing.status,
        closedAt: existing.closedAt,
        closedById: existing.closedById,
      },
      newValues: {
        status: followUp.status,
        closedAt: null,
        closedById: null,
      },
      ipAddress,
    });

    await sendFollowUpNotification(this.prisma, {
      institutionId,
      followUpId: followUp.id,
      studentId: followUp.studentId,
      confidentiality: followUp.confidentiality,
      actorUserId: userId,
    }, 'REOPENED');

    return followUp;
  }
}
