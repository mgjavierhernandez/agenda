import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { MembershipStatus, InstitutionStatus } from '@prisma/client';

describe('TenantContextService', () => {
  let service: TenantContextService;
  let prismaMock: {
    userInstitution: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    globalUserRole: {
      findFirst: jest.Mock;
    };
    institution: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaMock = {
      userInstitution: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      globalUserRole: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      institution: {
        findUnique: jest.fn(),
      },
    };

    service = new TenantContextService(prismaMock as never);
  });

  describe('getUserInstitutions', () => {
    it('should return institutions for a user', async () => {
      const userId = 'user-1';
      const mockMemberships = [
        {
          institution: {
            id: 'inst-1',
            name: 'School A',
            slug: 'school-a',
            status: InstitutionStatus.ACTIVE,
          },
        },
        {
          institution: {
            id: 'inst-2',
            name: 'School B',
            slug: 'school-b',
            status: InstitutionStatus.ACTIVE,
          },
        },
      ];

      prismaMock.userInstitution.findMany.mockResolvedValue(mockMemberships);

      const result = await service.getUserInstitutions(userId);

      expect(result).toEqual([
        { id: 'inst-1', name: 'School A', slug: 'school-a', status: InstitutionStatus.ACTIVE },
        { id: 'inst-2', name: 'School B', slug: 'school-b', status: InstitutionStatus.ACTIVE },
      ]);
      expect(prismaMock.userInstitution.findMany).toHaveBeenCalledWith({
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
    });

    it('should return empty array for user with no memberships', async () => {
      prismaMock.userInstitution.findMany.mockResolvedValue([]);

      const result = await service.getUserInstitutions('user-no-memberships');

      expect(result).toEqual([]);
    });
  });

  describe('validateTenantAccess', () => {
    const userId = 'user-1';
    const institutionId = 'inst-1';

    it('should return tenant context for valid access', async () => {
      const mockMembership = {
        id: 'membership-1',
        status: MembershipStatus.ACTIVE,
        institution: {
          id: institutionId,
          status: InstitutionStatus.ACTIVE,
        },
      };

      prismaMock.userInstitution.findUnique.mockResolvedValue(mockMembership);

      const result = await service.validateTenantAccess(userId, institutionId);

      expect(result).toEqual({
        institutionId,
        userInstitutionId: 'membership-1',
      });
    });

    it('should throw ForbiddenException for non-existent membership', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue(null);

      await expect(service.validateTenantAccess(userId, institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for INACTIVE membership', async () => {
      const mockMembership = {
        id: 'membership-1',
        status: MembershipStatus.INACTIVE,
        institution: {
          id: institutionId,
          status: InstitutionStatus.ACTIVE,
        },
      };

      prismaMock.userInstitution.findUnique.mockResolvedValue(mockMembership);

      await expect(service.validateTenantAccess(userId, institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for SUSPENDED membership', async () => {
      const mockMembership = {
        id: 'membership-1',
        status: MembershipStatus.SUSPENDED,
        institution: {
          id: institutionId,
          status: InstitutionStatus.ACTIVE,
        },
      };

      prismaMock.userInstitution.findUnique.mockResolvedValue(mockMembership);

      await expect(service.validateTenantAccess(userId, institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for INACTIVE institution', async () => {
      const mockMembership = {
        id: 'membership-1',
        status: MembershipStatus.ACTIVE,
        institution: {
          id: institutionId,
          status: InstitutionStatus.INACTIVE,
        },
      };

      prismaMock.userInstitution.findUnique.mockResolvedValue(mockMembership);

      await expect(service.validateTenantAccess(userId, institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for SUSPENDED institution', async () => {
      const mockMembership = {
        id: 'membership-1',
        status: MembershipStatus.ACTIVE,
        institution: {
          id: institutionId,
          status: InstitutionStatus.SUSPENDED,
        },
      };

      prismaMock.userInstitution.findUnique.mockResolvedValue(mockMembership);

      await expect(service.validateTenantAccess(userId, institutionId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow SUPER_ADMIN access without membership', async () => {
      prismaMock.globalUserRole.findFirst.mockResolvedValue({
        id: 'gur-1',
        userId,
        role: { name: 'SUPER_ADMIN' },
      });
      prismaMock.institution.findUnique.mockResolvedValue({
        id: institutionId,
        status: InstitutionStatus.ACTIVE,
      });
      prismaMock.userInstitution.findUnique.mockResolvedValue(null);
      prismaMock.userInstitution.create.mockResolvedValue({
        id: 'new-membership',
        userId,
        institutionId,
        status: MembershipStatus.ACTIVE,
      });

      const result = await service.validateTenantAccess(userId, institutionId);

      expect(result).toEqual({
        institutionId,
        userInstitutionId: 'new-membership',
      });
    });
  });

  describe('getInstitutionForContext', () => {
    const userId = 'user-1';
    const institutionId = 'inst-1';

    it('should return institution and membership details', async () => {
      const mockMembership = {
        id: 'membership-1',
        status: MembershipStatus.ACTIVE,
        institution: {
          id: institutionId,
          name: 'School A',
          slug: 'school-a',
          status: InstitutionStatus.ACTIVE,
        },
      };

      prismaMock.userInstitution.findUnique.mockResolvedValue(mockMembership);

      const result = await service.getInstitutionForContext(userId, institutionId);

      expect(result).toEqual({
        institution: {
          id: institutionId,
          name: 'School A',
          slug: 'school-a',
          status: InstitutionStatus.ACTIVE,
        },
        membership: {
          id: 'membership-1',
          status: MembershipStatus.ACTIVE,
        },
      });
    });

    it('should throw NotFoundException for non-existent membership', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue(null);

      await expect(service.getInstitutionForContext(userId, institutionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
