import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma';
import { RoleType } from '@prisma/client';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async hasPermission(
    userId: string,
    institutionId: string,
    permissionCode: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissionCodes(userId, institutionId);
    return permissions.includes(permissionCode);
  }

  async hasAnyPermission(
    userId: string,
    institutionId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    const permissions = await this.getUserPermissionCodes(userId, institutionId);
    return permissionCodes.some((code) => permissions.includes(code));
  }

  async hasAllPermissions(
    userId: string,
    institutionId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    const permissions = await this.getUserPermissionCodes(userId, institutionId);
    return permissionCodes.every((code) => permissions.includes(code));
  }

  async getUserPermissionCodes(userId: string, institutionId: string): Promise<string[]> {
    const tenantPermissions = await this.getTenantPermissionCodes(userId, institutionId);
    const globalPermissions = await this.getGlobalPermissionCodes(userId);

    const allPermissions = new Set([...tenantPermissions, ...globalPermissions]);
    return Array.from(allPermissions);
  }

  async getUserRoles(
    userId: string,
    institutionId: string,
  ): Promise<Array<{ id: string; name: string; roleType: RoleType }>> {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userInstitution: {
          userId,
          institutionId,
          status: 'ACTIVE',
        },
        institutionId,
        role: {
          roleType: RoleType.TENANT,
        },
      },
      select: {
        role: {
          select: {
            id: true,
            name: true,
            roleType: true,
          },
        },
      },
    });

    return userRoles.map((ur) => ur.role);
  }

  async hasRole(userId: string, institutionId: string, roleName: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId, institutionId);
    return roles.some((role) => role.name === roleName);
  }

  async getGlobalPermissionCodes(userId: string): Promise<string[]> {
    const globalRoles = await this.prisma.globalUserRole.findMany({
      where: {
        userId,
        role: {
          roleType: RoleType.GLOBAL,
        },
      },
      select: {
        role: {
          select: {
            permissions: {
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();
    for (const gr of globalRoles) {
      for (const rp of gr.role.permissions) {
        permissions.add(rp.permission.code);
      }
    }

    return Array.from(permissions);
  }

  private async getTenantPermissionCodes(userId: string, institutionId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userInstitution: {
          userId,
          institutionId,
          status: 'ACTIVE',
        },
        institutionId,
        role: {
          roleType: RoleType.TENANT,
        },
      },
      select: {
        role: {
          select: {
            permissions: {
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.permissions) {
        permissions.add(rp.permission.code);
      }
    }

    return Array.from(permissions);
  }
}
