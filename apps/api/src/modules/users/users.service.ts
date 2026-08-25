import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { CreateUserDto, UpdateUserDto, ListUsersQueryDto } from './dto/user.dto';
import { User, UserStatus, Prisma } from '@prisma/client';
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

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    await this.auditService.log({
      userId,
      institutionId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      newValues: { email: user.email, firstName: user.firstName, lastName: user.lastName },
      ipAddress,
    });

    return this.sanitizeUser(user);
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

    const user = await this.prisma.user.findUnique({ where: { id } });
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
