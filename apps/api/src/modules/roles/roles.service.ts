import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { Role } from '@prisma/client';

const ASSIGNABLE_TENANT_ROLES = ['INSTITUTION_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'];

export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  assignable: boolean;
}

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(institutionId: string): Promise<RoleListItem[]> {
    const roles = await this.prisma.role.findMany({
      where: {
        institutionId,
        roleType: 'TENANT',
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role: Role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      assignable: ASSIGNABLE_TENANT_ROLES.includes(role.name),
    }));
  }
}
