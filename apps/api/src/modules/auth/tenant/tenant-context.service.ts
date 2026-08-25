import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma';
import { InstitutionStatus, MembershipStatus } from '@prisma/client';

export interface TenantContext {
  institutionId: string;
  userInstitutionId: string;
}

export interface InstitutionListItem {
  id: string;
  name: string;
  slug: string;
  status: InstitutionStatus;
}

@Injectable()
export class TenantContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserInstitutions(userId: string): Promise<InstitutionListItem[]> {
    const memberships = await this.prisma.userInstitution.findMany({
      where: { userId },
      select: {
        institution: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    return memberships.map((m) => m.institution);
  }

  async validateTenantAccess(userId: string, institutionId: string): Promise<TenantContext> {
    const globalAdmin = await this.prisma.globalUserRole.findFirst({
      where: {
        userId,
        role: { name: 'SUPER_ADMIN' },
      },
    });

    if (globalAdmin) {
      const institution = await this.prisma.institution.findUnique({
        where: { id: institutionId },
        select: { id: true, status: true },
      });

      if (!institution || institution.status !== InstitutionStatus.ACTIVE) {
        throw new ForbiddenException('Institution not found or not active');
      }

      const existingMembership = await this.prisma.userInstitution.findUnique({
        where: { userId_institutionId: { userId, institutionId } },
        select: { id: true },
      });

      if (existingMembership) {
        return { institutionId, userInstitutionId: existingMembership.id };
      }

      const newMembership = await this.prisma.userInstitution.create({
        data: {
          userId,
          institutionId,
          status: MembershipStatus.ACTIVE,
        },
      });

      return { institutionId, userInstitutionId: newMembership.id };
    }

    const membership = await this.prisma.userInstitution.findUnique({
      where: {
        userId_institutionId: { userId, institutionId },
      },
      select: {
        id: true,
        status: true,
        institution: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied to this institution');
    }

    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new ForbiddenException('Membership is not active');
    }

    if (membership.institution.status !== InstitutionStatus.ACTIVE) {
      throw new ForbiddenException('Institution is not active');
    }

    return {
      institutionId: membership.institution.id,
      userInstitutionId: membership.id,
    };
  }

  async getInstitutionForContext(userId: string, institutionId: string) {
    const membership = await this.prisma.userInstitution.findUnique({
      where: {
        userId_institutionId: { userId, institutionId },
      },
      select: {
        id: true,
        status: true,
        institution: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Institution not found or access denied');
    }

    return {
      institution: membership.institution,
      membership: {
        id: membership.id,
        status: membership.status,
      },
    };
  }
}
