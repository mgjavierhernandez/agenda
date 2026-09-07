import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateUserDto, UpdateUserDto, ListUsersQueryDto } from './dto/user.dto';
import { UpsertUserProfileDto } from './dto/user-profile.dto';
import { User, UserProfile, UserStatus, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private sanitizeUser({ passwordHash, ...user }: User) {
    return user;
  }

  private sanitizeProfile(profile: UserProfile) {
    return profile;
  }

  private validateProfileDocumentPair(dto: UpsertUserProfileDto): void {
    const hasType = dto.documentType !== undefined && dto.documentType !== null;
    const hasNumber =
      dto.documentNumber !== undefined && dto.documentNumber !== null && dto.documentNumber.trim() !== '';
    if (hasType !== hasNumber) {
      throw new BadRequestException('documentType and documentNumber must be provided together');
    }
  }

  private async assertDocumentUnique(
    institutionId: string,
    dto: UpsertUserProfileDto,
    excludeUserId?: string,
  ): Promise<void> {
    if (!dto.documentType || !dto.documentNumber) return;
    const existing = await this.prisma.userProfile.findFirst({
      where: {
        institutionId,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber.trim(),
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Document already registered in this institution');
    }
  }

  private toProfileData(institutionId: string, userId: string, dto: UpsertUserProfileDto): Prisma.UserProfileCreateInput {
    return {
      user: { connect: { id: userId } },
      institution: { connect: { id: institutionId } },
      documentType: dto.documentType ?? null,
      documentNumber: dto.documentNumber ? dto.documentNumber.trim() : null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      profession: dto.profession ?? null,
      bio: dto.bio ?? null,
    };
  }

  private async assertMembership(institutionId: string, id: string): Promise<void> {
    const membership = await this.prisma.userInstitution.findUnique({
      where: { userId_institutionId: { userId: id, institutionId } },
    });
    if (!membership) {
      throw new NotFoundException('User not found in this institution');
    }
  }

  /**
   * Links an unclaimed Student record (same institution + exact document)
   * to the user's account. Never reassigns an already-linked record.
   */
  private async linkStudentAccount(
    institutionId: string,
    userId: string,
    documentType?: string | null,
    documentNumber?: string | null,
  ): Promise<string | null> {
    const cleanNumber = documentNumber?.trim();
    if (!documentType || !cleanNumber) return null;

    const unclaimed = await this.prisma.student.findFirst({
      where: { institutionId, documentType: documentType as never, documentNumber: cleanNumber, userId: null },
      select: { id: true },
    });
    if (!unclaimed) return null;

    await this.prisma.student.update({
      where: { id: unclaimed.id },
      data: { userId },
    });
    return unclaimed.id;
  }

  async create(
    institutionId: string,
    dto: CreateUserDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await this.hashPassword(dto.password);

    if (dto.profile) {
      this.validateProfileDocumentPair(dto.profile);
      await this.assertDocumentUnique(institutionId, dto.profile);
    }

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        ...(dto.profile
          ? {
              profiles: {
                create: {
                  institutionId,
                  documentType: dto.profile.documentType ?? null,
                  documentNumber: dto.profile.documentNumber ? dto.profile.documentNumber.trim() : null,
                  phone: dto.profile.phone ?? null,
                  address: dto.profile.address ?? null,
                  birthDate: dto.profile.birthDate ? new Date(dto.profile.birthDate) : null,
                  profession: dto.profile.profession ?? null,
                  bio: dto.profile.bio ?? null,
                },
              },
            }
          : {}),
      },
      include: { profiles: { where: { institutionId } } },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      newValues: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        ...(dto.profile?.documentNumber
          ? { documentType: dto.profile.documentType, documentNumber: dto.profile.documentNumber.trim() }
          : {}),
      },
      ipAddress,
    });

    if (dto.profile) {
      await this.linkStudentAccount(
        institutionId,
        user.id,
        dto.profile.documentType,
        dto.profile.documentNumber,
      );
    }

    return this.sanitizeUser(user);
  }

  async findProfile(institutionId: string, id: string): Promise<UserProfile | null> {
    await this.assertMembership(institutionId, id);

    return this.prisma.userProfile.findUnique({
      where: { userId_institutionId: { userId: id, institutionId } },
    });
  }

  async upsertProfile(
    institutionId: string,
    id: string,
    dto: UpsertUserProfileDto,
    userId: string,
    ipAddress?: string,
  ): Promise<UserProfile> {
    await this.assertMembership(institutionId, id);

    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    this.validateProfileDocumentPair(dto);
    await this.assertDocumentUnique(institutionId, dto, id);

    let profile: UserProfile;
    try {
      profile = await this.prisma.userProfile.upsert({
        where: { userId_institutionId: { userId: id, institutionId } },
        create: this.toProfileData(institutionId, id, dto),
        update: {
          documentType: dto.documentType ?? null,
          documentNumber: dto.documentNumber ? dto.documentNumber.trim() : null,
          phone: dto.phone ?? null,
          address: dto.address ?? null,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          profession: dto.profession ?? null,
          bio: dto.bio ?? null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Document already registered in this institution');
      }
      throw error;
    }

    await this.auditService.log({
      userId,
      institutionId,
      action: 'USER_PROFILE_UPSERTED',
      entityType: 'UserProfile',
      entityId: profile.id,
      newValues: {
        profileUserId: id,
        documentType: profile.documentType,
        documentNumber: profile.documentNumber,
      },
      ipAddress,
    });

    await this.linkStudentAccount(
      institutionId,
      id,
      dto.documentType,
      dto.documentNumber,
    );

    return this.sanitizeProfile(profile);
  }

  async findAll(
    institutionId: string,
    query: ListUsersQueryDto,
  ): Promise<{ data: Omit<User, 'passwordHash'>[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const membershipUserIds = await this.prisma.userInstitution.findMany({
      where: { institutionId },
      select: { userId: true },
    });
    const userIds = membershipUserIds.map((m) => m.userId);

    const where: Prisma.UserWhereInput = {
      id: { in: userIds },
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map((u) => this.sanitizeUser(u)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(
    institutionId: string,
    id: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const membership = await this.prisma.userInstitution.findUnique({
      where: { userId_institutionId: { userId: id, institutionId } },
    });
    if (!membership) {
      throw new NotFoundException('User not found in this institution');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profiles: { where: { institutionId } } },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async update(
    institutionId: string,
    id: string,
    dto: UpdateUserDto,
    userId: string,
    ipAddress?: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const membership = await this.prisma.userInstitution.findUnique({
      where: { userId_institutionId: { userId: id, institutionId } },
    });
    if (!membership) {
      throw new NotFoundException('User not found in this institution');
    }

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== existing.email) {
      const normalizedEmail = dto.email.toLowerCase().trim();
      const emailExists = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email.toLowerCase().trim() }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user.id,
      oldValues: { firstName: existing.firstName, lastName: existing.lastName, status: existing.status },
      newValues: { firstName: user.firstName, lastName: user.lastName, status: user.status },
      ipAddress,
    });

    return this.sanitizeUser(user);
  }

  async deactivate(
    institutionId: string,
    id: string,
    userId: string,
    ipAddress?: string,
  ): Promise<Omit<User, 'passwordHash'>> {
    const membership = await this.prisma.userInstitution.findUnique({
      where: { userId_institutionId: { userId: id, institutionId } },
    });
    if (!membership) {
      throw new NotFoundException('User not found in this institution');
    }

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (existing.status === UserStatus.INACTIVE) {
      return this.sanitizeUser(existing);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: user.id,
      oldValues: { status: existing.status },
      newValues: { status: user.status },
      ipAddress,
    });

    return this.sanitizeUser(user);
  }
}
