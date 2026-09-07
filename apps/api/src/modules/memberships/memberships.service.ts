import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { LinkUserDto, UpdateMembershipDto, AssignRoleDto, ListMembershipsQueryDto } from './dto/membership.dto';
import { UserInstitution, UserRole, MembershipStatus, UserStatus, Prisma } from '@prisma/client';
import { ASSIGNABLE_TENANT_ROLES } from '../../common/rbac/assignable-roles';

const SUPER_ADMIN_ROLE_NAME = 'SUPER_ADMIN';
const INSTITUTION_ADMIN_ROLE_NAME = 'INSTITUTION_ADMIN';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async validateActorCanManageRoles(
    actorUserId: string,
    institutionId: string,
    targetRoleIds: string[],
  ): Promise<void> {
    const actorGlobalAdmin = await this.prisma.globalUserRole.findFirst({
      where: {
        userId: actorUserId,
        role: { name: SUPER_ADMIN_ROLE_NAME },
      },
    });

    if (actorGlobalAdmin) return;

    const actorMembership = await this.prisma.userInstitution.findUnique({
      where: { userId_institutionId: { userId: actorUserId, institutionId } },
    });
    if (!actorMembership) {
      throw new ForbiddenException('Not a member of this institution');
    }

    const actorRoles = await this.prisma.userRole.findMany({
      where: { userInstitutionId: actorMembership.id },
      include: { role: { select: { name: true } } },
    });
    const actorRoleNames = actorRoles.map((ur) => ur.role.name);

    if (!actorRoleNames.includes(INSTITUTION_ADMIN_ROLE_NAME)) {
      throw new ForbiddenException('Only administrators can manage roles');
    }

    const targetRoles = await this.prisma.role.findMany({
      where: { id: { in: targetRoleIds } },
      select: { name: true, roleType: true, institutionId: true },
    });

    for (const role of targetRoles) {
      if (role.name === SUPER_ADMIN_ROLE_NAME) {
        throw new ForbiddenException('Cannot assign SUPER_ADMIN role');
      }
      if (!ASSIGNABLE_TENANT_ROLES.includes(role.name)) {
        throw new ForbiddenException(`Cannot assign role: ${role.name}`);
      }
      // Tenancy scoping: tenant roles must belong to the target institution.
      // Template roles are usable within any tenant; global roles are never assignable.
      if (role.roleType !== 'TEMPLATE' && role.institutionId !== institutionId) {
        throw new ForbiddenException('Cannot assign a role from another institution');
      }
    }
  }

  async linkUser(
    institutionId: string,
    dto: LinkUserDto,
    actorUserId: string,
    ipAddress?: string,
  ): Promise<UserInstitution> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const institution = await this.prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) throw new NotFoundException('Institution not found');

    const existing = await this.prisma.userInstitution.findUnique({
      where: { userId_institutionId: { userId: dto.userId, institutionId } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this institution');
    }

    if (dto.roleIds && dto.roleIds.length > 0) {
      await this.validateActorCanManageRoles(actorUserId, institutionId, dto.roleIds);
    }

    const membership = await this.prisma.userInstitution.create({
      data: {
        userId: dto.userId,
        institutionId,
      },
    });

    if (dto.roleIds && dto.roleIds.length > 0) {
      for (const roleId of dto.roleIds) {
        await this.prisma.userRole.create({
          data: {
            userInstitutionId: membership.id,
            roleId,
            institutionId,
          },
        });
      }
    }

    await this.auditService.log({
      userId: actorUserId,
      institutionId,
      action: 'USER_INSTITUTION_LINKED',
      entityType: 'UserInstitution',
      entityId: membership.id,
      newValues: { userId: dto.userId, roleIds: dto.roleIds ?? [] },
      ipAddress,
    });

    return membership;
  }

  async findAll(
    institutionId: string,
    query: ListMembershipsQueryDto,
  ): Promise<{ data: UserInstitution[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserInstitutionWhereInput = {
      institutionId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            user: {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.userInstitution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              status: true,
              profiles: { where: { institutionId } },
            },
          },
          roles: { include: { role: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.userInstitution.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(
    institutionId: string,
    membershipId: string,
  ): Promise<UserInstitution> {
    const membership = await this.prisma.userInstitution.findFirst({
      where: { id: membershipId, institutionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            profiles: { where: { institutionId } },
          },
        },
        roles: { include: { role: { select: { id: true, name: true } } } },
      },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    return membership;
  }

  async findByUserId(
    institutionId: string,
    userId: string,
  ): Promise<UserInstitution> {
    const membership = await this.prisma.userInstitution.findUnique({
      where: { userId_institutionId: { userId, institutionId } },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
        roles: { include: { role: { select: { id: true, name: true } } } },
      },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    return membership;
  }

  async update(
    institutionId: string,
    membershipId: string,
    dto: UpdateMembershipDto,
    actorUserId: string,
    ipAddress?: string,
  ): Promise<UserInstitution> {
    const existing = await this.prisma.userInstitution.findFirst({
      where: { id: membershipId, institutionId },
    });
    if (!existing) {
      throw new NotFoundException('Membership not found');
    }

    const membership = await this.prisma.userInstitution.update({
      where: { id: membershipId },
      data: { ...(dto.status !== undefined && { status: dto.status }) },
    });

    await this.auditService.log({
      userId: actorUserId,
      institutionId,
      action: 'USER_INSTITUTION_UPDATED',
      entityType: 'UserInstitution',
      entityId: membership.id,
      oldValues: { status: existing.status },
      newValues: { status: membership.status },
      ipAddress,
    });

    return membership;
  }

  async approve(
    institutionId: string,
    membershipId: string,
    actorUserId: string,
    ipAddress?: string,
  ): Promise<UserInstitution> {
    const existing = await this.prisma.userInstitution.findFirst({
      where: { id: membershipId, institutionId },
    });
    if (!existing) {
      throw new NotFoundException('Membership not found');
    }
    if (existing.status !== MembershipStatus.PENDING) {
      throw new ConflictException('Only PENDING requests can be approved');
    }

    // Resolve the requested role: tenant role first, template role as fallback.
    let roleId: string | null = null;
    if (existing.requestedRole) {
      const tenantRole = await this.prisma.role.findFirst({
        where: { name: existing.requestedRole, institutionId },
        select: { id: true },
      });
      if (tenantRole) {
        roleId = tenantRole.id;
      } else {
        const templateRole = await this.prisma.role.findFirst({
          where: { name: existing.requestedRole, roleType: 'TEMPLATE', institutionId: null },
          select: { id: true },
        });
        if (templateRole) roleId = templateRole.id;
      }
    }

    if (roleId) {
      await this.validateActorCanManageRoles(actorUserId, institutionId, [roleId]);
    }

    const membership = await this.prisma.userInstitution.update({
      where: { id: membershipId },
      data: { status: MembershipStatus.ACTIVE },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: existing.userId },
      select: { id: true, status: true },
    });
    if (user && user.status !== UserStatus.ACTIVE) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.ACTIVE },
      });
    }

    if (roleId) {
      const existingRole = await this.prisma.userRole.findUnique({
        where: { userInstitutionId_roleId: { userInstitutionId: membership.id, roleId } },
      });
      if (!existingRole) {
        await this.prisma.userRole.create({
          data: { userInstitutionId: membership.id, roleId, institutionId },
        });
      }
    }

    await this.auditService.log({
      userId: actorUserId,
      institutionId,
      action: 'MEMBERSHIP_APPROVED',
      entityType: 'UserInstitution',
      entityId: membership.id,
      oldValues: { status: existing.status },
      newValues: { status: membership.status, requestedRole: existing.requestedRole, roleId },
      ipAddress,
    });

    return membership;
  }

  async reject(
    institutionId: string,
    membershipId: string,
    actorUserId: string,
    ipAddress?: string,
  ): Promise<UserInstitution> {
    const existing = await this.prisma.userInstitution.findFirst({
      where: { id: membershipId, institutionId },
    });
    if (!existing) {
      throw new NotFoundException('Membership not found');
    }
    if (existing.status !== MembershipStatus.PENDING) {
      throw new ConflictException('Only PENDING requests can be rejected');
    }

    const membership = await this.prisma.userInstitution.update({
      where: { id: membershipId },
      data: { status: MembershipStatus.REJECTED },
    });

    await this.auditService.log({
      userId: actorUserId,
      institutionId,
      action: 'MEMBERSHIP_REJECTED',
      entityType: 'UserInstitution',
      entityId: membership.id,
      oldValues: { status: existing.status },
      newValues: { status: membership.status },
      ipAddress,
    });

    return membership;
  }

  async unlinkUser(
    institutionId: string,
    userId: string,
    actorUserId: string,
    ipAddress?: string,
  ): Promise<void> {    const membership = await this.prisma.userInstitution.findUnique({
      where: { userId_institutionId: { userId, institutionId } },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    await this.prisma.userRole.deleteMany({
      where: { userInstitutionId: membership.id },
    });

    await this.prisma.userInstitution.delete({
      where: { id: membership.id },
    });

    await this.auditService.log({
      userId: actorUserId,
      institutionId,
      action: 'USER_INSTITUTION_UNLINKED',
      entityType: 'UserInstitution',
      entityId: membership.id,
      oldValues: { userId },
      ipAddress,
    });
  }

  async assignRole(
    institutionId: string,
    userId: string,
    dto: AssignRoleDto,
    actorUserId: string,
    ipAddress?: string,
  ): Promise<UserRole> {
    const membership = await this.prisma.userInstitution.findUnique({
      where: { userId_institutionId: { userId, institutionId } },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    await this.validateActorCanManageRoles(actorUserId, institutionId, [dto.roleId]);

    const existingRole = await this.prisma.userRole.findUnique({
      where: { userInstitutionId_roleId: { userInstitutionId: membership.id, roleId: dto.roleId } },
    });
    if (existingRole) {
      throw new ConflictException('User already has this role');
    }

    const userRole = await this.prisma.userRole.create({
      data: {
        userInstitutionId: membership.id,
        roleId: dto.roleId,
        institutionId,
      },
    });

    await this.auditService.log({
      userId: actorUserId,
      institutionId,
      action: 'USER_ROLE_ASSIGNED',
      entityType: 'UserRole',
      entityId: userRole.id,
      newValues: { userId, roleId: dto.roleId },
      ipAddress,
    });

    return userRole;
  }

  async removeRole(
    institutionId: string,
    userId: string,
    roleId: string,
    actorUserId: string,
    ipAddress?: string,
  ): Promise<void> {
    const membership = await this.prisma.userInstitution.findUnique({
      where: { userId_institutionId: { userId, institutionId } },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    await this.validateActorCanManageRoles(actorUserId, institutionId, [roleId]);

    const userRole = await this.prisma.userRole.findUnique({
      where: { userInstitutionId_roleId: { userInstitutionId: membership.id, roleId } },
    });
    if (!userRole) {
      throw new NotFoundException('Role assignment not found');
    }

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (role?.name === INSTITUTION_ADMIN_ROLE_NAME) {
      const adminCount = await this.prisma.userRole.count({
        where: {
          institutionId,
          role: { name: INSTITUTION_ADMIN_ROLE_NAME },
        },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot remove the last INSTITUTION_ADMIN');
      }
    }

    await this.prisma.userRole.delete({
      where: { id: userRole.id },
    });

    await this.auditService.log({
      userId: actorUserId,
      institutionId,
      action: 'USER_ROLE_REMOVED',
      entityType: 'UserRole',
      entityId: userRole.id,
      oldValues: { userId, roleId },
      ipAddress,
    });
  }
}
