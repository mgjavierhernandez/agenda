import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { MembershipStatus } from '@prisma/client';

describe('MembershipsService', () => {
  let service: MembershipsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prismaMock: Record<string, any>;
  let auditServiceMock: { log: jest.Mock };

  const institutionId = 'inst-1';
  const actorUserId = 'admin-1';

  beforeEach(() => {
    prismaMock = {
      user: { findUnique: jest.fn() },
      institution: { findUnique: jest.fn() },
      userInstitution: {
        findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
        count: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
      },
      userRole: {
        findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(),
        delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn(),
      },
      role: { findMany: jest.fn(), findUnique: jest.fn() },
      globalUserRole: { findFirst: jest.fn() },
    };
    auditServiceMock = { log: jest.fn() };
    service = new MembershipsService(prismaMock as never, auditServiceMock as never);
  });

  describe('linkUser', () => {
    it('should link user to institution', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1' });
      prismaMock.institution.findUnique.mockResolvedValue({ id: institutionId });
      prismaMock.userInstitution.findUnique.mockResolvedValue(null);
      prismaMock.userInstitution.create.mockResolvedValue({
        id: 'm-1', userId: 'u-1', institutionId, status: MembershipStatus.ACTIVE,
      });

      const result = await service.linkUser(institutionId, { userId: 'u-1' }, actorUserId);
      expect(result.userId).toBe('u-1');
    });

    it('should reject duplicate membership', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1' });
      prismaMock.institution.findUnique.mockResolvedValue({ id: institutionId });
      prismaMock.userInstitution.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.linkUser(institutionId, { userId: 'u-1' }, actorUserId),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(
        service.linkUser(institutionId, { userId: 'u-1' }, actorUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unlinkUser', () => {
    it('should unlink user from institution', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({ id: 'm-1', userId: 'u-1' });
      prismaMock.userRole.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.userInstitution.delete.mockResolvedValue({});

      await service.unlinkUser(institutionId, 'u-1', actorUserId);
      expect(prismaMock.userInstitution.delete).toHaveBeenCalled();
    });

    it('should throw if membership not found', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue(null);
      await expect(
        service.unlinkUser(institutionId, 'u-1', actorUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({ id: 'm-1' });
      prismaMock.globalUserRole.findFirst.mockResolvedValue(null);
      prismaMock.userRole.findMany.mockResolvedValue([
        { role: { name: 'INSTITUTION_ADMIN' } },
      ]);
      prismaMock.role.findMany.mockResolvedValue([{ name: 'TEACHER', roleType: 'TENANT' }]);
      prismaMock.userRole.findUnique.mockResolvedValue(null);
      prismaMock.userRole.create.mockResolvedValue({ id: 'ur-1', roleId: 'role-1' });

      const result = await service.assignRole(institutionId, 'u-1', { roleId: 'role-1' }, actorUserId);
      expect(result.roleId).toBe('role-1');
    });

    it('should reject duplicate role assignment', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({ id: 'm-1' });
      prismaMock.globalUserRole.findFirst.mockResolvedValue(null);
      prismaMock.userRole.findMany.mockResolvedValue([
        { role: { name: 'INSTITUTION_ADMIN' } },
      ]);
      prismaMock.role.findMany.mockResolvedValue([{ name: 'TEACHER', roleType: 'TENANT' }]);
      prismaMock.userRole.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.assignRole(institutionId, 'u-1', { roleId: 'role-1' }, actorUserId),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject SUPER_ADMIN assignment', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({ id: 'm-1' });
      prismaMock.globalUserRole.findFirst.mockResolvedValue(null);
      prismaMock.userRole.findMany.mockResolvedValue([
        { role: { name: 'INSTITUTION_ADMIN' } },
      ]);
      prismaMock.role.findMany.mockResolvedValue([{ name: 'SUPER_ADMIN', roleType: 'GLOBAL' }]);

      await expect(
        service.assignRole(institutionId, 'u-1', { roleId: 'role-1' }, actorUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
