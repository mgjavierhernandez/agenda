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
      user: { findUnique: jest.fn(), update: jest.fn() },
      institution: { findUnique: jest.fn() },
      userInstitution: {
        findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
        count: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
      },
      userRole: {
        findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(),
        delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn(),
      },
      role: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
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
      prismaMock.role.findMany.mockResolvedValue([{ name: 'TEACHER', roleType: 'TENANT', institutionId }]);
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
      prismaMock.role.findMany.mockResolvedValue([{ name: 'TEACHER', roleType: 'TENANT', institutionId }]);
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
      prismaMock.role.findMany.mockResolvedValue([{ name: 'SUPER_ADMIN', roleType: 'GLOBAL', institutionId: null }]);

      await expect(
        service.assignRole(institutionId, 'u-1', { roleId: 'role-1' }, actorUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject assigning a role from another institution', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({ id: 'm-1' });
      prismaMock.globalUserRole.findFirst.mockResolvedValue(null);
      prismaMock.userRole.findMany.mockResolvedValue([
        { role: { name: 'INSTITUTION_ADMIN' } },
      ]);
      prismaMock.role.findMany.mockResolvedValue([
        { name: 'TEACHER', roleType: 'TENANT', institutionId: 'other-inst' },
      ]);

      await expect(
        service.assignRole(institutionId, 'u-1', { roleId: 'foreign-role' }, actorUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should apply search filter to linked users', async () => {
      prismaMock.userInstitution.findMany.mockResolvedValue([
        { id: 'm-1', institutionId, user: { email: 'maria@example.com' }, roles: [] },
      ]);
      prismaMock.userInstitution.count.mockResolvedValue(1);

      await service.findAll(institutionId, { search: 'maria' });

      const findManyArg = prismaMock.userInstitution.findMany.mock.calls[0][0];
      expect(findManyArg.where.search).toBeUndefined();
      expect(findManyArg.where.user.OR).toBeDefined();
    });

    it('should apply status filter', async () => {
      prismaMock.userInstitution.findMany.mockResolvedValue([]);
      prismaMock.userInstitution.count.mockResolvedValue(0);

      await service.findAll(institutionId, { status: MembershipStatus.ACTIVE });

      const findManyArg = prismaMock.userInstitution.findMany.mock.calls[0][0];
      expect(findManyArg.where.status).toBe(MembershipStatus.ACTIVE);
    });
  });

  describe('approve/reject (GAP-2)', () => {
    const pendingMembership = {
      id: 'm-pending', userId: 'u-1', institutionId, status: MembershipStatus.PENDING, requestedRole: 'TEACHER',
    };

    function mockSuperAdminActor() {
      prismaMock.globalUserRole.findFirst.mockResolvedValue({ role: { name: 'SUPER_ADMIN' } });
    }

    it('should approve a PENDING request, activate user and assign requested role', async () => {
      mockSuperAdminActor();
      prismaMock.userInstitution.findFirst.mockResolvedValue(pendingMembership);
      prismaMock.role.findFirst.mockResolvedValue({ id: 'role-teacher' });
      prismaMock.userInstitution.update.mockResolvedValue({ ...pendingMembership, status: MembershipStatus.ACTIVE });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1', status: 'INACTIVE' });
      prismaMock.user.update.mockResolvedValue({ id: 'u-1', status: 'ACTIVE' });
      prismaMock.userRole.findUnique.mockResolvedValue(null);
      prismaMock.userRole.create.mockResolvedValue({ id: 'ur-1' });

      const result = await service.approve(institutionId, 'm-pending', actorUserId);

      expect(result.status).toBe(MembershipStatus.ACTIVE);
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }),
      );
      expect(prismaMock.userRole.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roleId: 'role-teacher' }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MEMBERSHIP_APPROVED' }),
      );
    });

    it('should reject approval when membership is not PENDING', async () => {
      prismaMock.userInstitution.findFirst.mockResolvedValue({ ...pendingMembership, status: MembershipStatus.ACTIVE });

      await expect(service.approve(institutionId, 'm-pending', actorUserId)).rejects.toThrow(ConflictException);
      expect(prismaMock.userInstitution.update).not.toHaveBeenCalled();
    });

    it('should reject a PENDING request without touching the user', async () => {
      prismaMock.userInstitution.findFirst.mockResolvedValue(pendingMembership);
      prismaMock.userInstitution.update.mockResolvedValue({ ...pendingMembership, status: MembershipStatus.REJECTED });

      const result = await service.reject(institutionId, 'm-pending', actorUserId);

      expect(result.status).toBe(MembershipStatus.REJECTED);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MEMBERSHIP_REJECTED' }),
      );
    });

    it('should reject rejection when membership is not PENDING', async () => {
      prismaMock.userInstitution.findFirst.mockResolvedValue({ ...pendingMembership, status: MembershipStatus.REJECTED });

      await expect(service.reject(institutionId, 'm-pending', actorUserId)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFound when membership does not exist', async () => {
      prismaMock.userInstitution.findFirst.mockResolvedValue(null);

      await expect(service.approve(institutionId, 'missing', actorUserId)).rejects.toThrow(NotFoundException);
      await expect(service.reject(institutionId, 'missing', actorUserId)).rejects.toThrow(NotFoundException);
    });
  });
});
