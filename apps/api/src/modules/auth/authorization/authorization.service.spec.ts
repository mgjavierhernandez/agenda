import { AuthorizationService } from './authorization.service';
import { RoleType } from '@prisma/client';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let prismaMock: {
    userRole: { findMany: jest.Mock };
    globalUserRole: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prismaMock = {
      userRole: { findMany: jest.fn() },
      globalUserRole: { findMany: jest.fn() },
    };

    service = new AuthorizationService(prismaMock as never);
  });

  describe('getUserPermissionCodes', () => {
    it('should return tenant permissions for a user', async () => {
      const userId = 'user-1';
      const institutionId = 'inst-1';

      prismaMock.userRole.findMany.mockResolvedValue([
        {
          role: {
            permissions: [
              { permission: { code: 'students:read' } },
              { permission: { code: 'grades:read' } },
            ],
          },
        },
      ]);

      prismaMock.globalUserRole.findMany.mockResolvedValue([]);

      const result = await service.getUserPermissionCodes(userId, institutionId);

      expect(result).toContain('students:read');
      expect(result).toContain('grades:read');
    });

    it('should combine tenant and global permissions', async () => {
      const userId = 'user-1';
      const institutionId = 'inst-1';

      prismaMock.userRole.findMany.mockResolvedValue([
        {
          role: {
            permissions: [{ permission: { code: 'students:read' } }],
          },
        },
      ]);

      prismaMock.globalUserRole.findMany.mockResolvedValue([
        {
          role: {
            permissions: [{ permission: { code: 'audit:read' } }],
          },
        },
      ]);

      const result = await service.getUserPermissionCodes(userId, institutionId);

      expect(result).toContain('students:read');
      expect(result).toContain('audit:read');
    });

    it('should return empty array for user with no roles', async () => {
      prismaMock.userRole.findMany.mockResolvedValue([]);
      prismaMock.globalUserRole.findMany.mockResolvedValue([]);

      const result = await service.getUserPermissionCodes('user-1', 'inst-1');

      expect(result).toEqual([]);
    });

    it('should deduplicate permissions from multiple roles', async () => {
      const userId = 'user-1';
      const institutionId = 'inst-1';

      prismaMock.userRole.findMany.mockResolvedValue([
        {
          role: {
            permissions: [{ permission: { code: 'students:read' } }],
          },
        },
        {
          role: {
            permissions: [{ permission: { code: 'students:read' } }],
          },
        },
      ]);

      prismaMock.globalUserRole.findMany.mockResolvedValue([]);

      const result = await service.getUserPermissionCodes(userId, institutionId);

      expect(result.filter((p) => p === 'students:read')).toHaveLength(1);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has the permission', async () => {
      prismaMock.userRole.findMany.mockResolvedValue([
        {
          role: {
            permissions: [{ permission: { code: 'students:read' } }],
          },
        },
      ]);
      prismaMock.globalUserRole.findMany.mockResolvedValue([]);

      const result = await service.hasPermission('user-1', 'inst-1', 'students:read');

      expect(result).toBe(true);
    });

    it('should return false when user lacks the permission', async () => {
      prismaMock.userRole.findMany.mockResolvedValue([
        {
          role: {
            permissions: [{ permission: { code: 'grades:read' } }],
          },
        },
      ]);
      prismaMock.globalUserRole.findMany.mockResolvedValue([]);

      const result = await service.hasPermission('user-1', 'inst-1', 'students:read');

      expect(result).toBe(false);
    });

    it('should return false for user with no roles', async () => {
      prismaMock.userRole.findMany.mockResolvedValue([]);
      prismaMock.globalUserRole.findMany.mockResolvedValue([]);

      const result = await service.hasPermission('user-1', 'inst-1', 'students:read');

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', async () => {
      prismaMock.userRole.findMany.mockResolvedValue([
        {
          role: {
            permissions: [{ permission: { code: 'students:read' } }],
          },
        },
      ]);
      prismaMock.globalUserRole.findMany.mockResolvedValue([]);

      const result = await service.hasAnyPermission('user-1', 'inst-1', [
        'students:read',
        'students:manage',
      ]);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the permissions', async () => {
      prismaMock.userRole.findMany.mockResolvedValue([
        {
          role: {
            permissions: [{ permission: { code: 'grades:read' } }],
          },
        },
      ]);
      prismaMock.globalUserRole.findMany.mockResolvedValue([]);

      const result = await service.hasAnyPermission('user-1', 'inst-1', [
        'students:read',
        'students:manage',
      ]);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all permissions', async () => {
      prismaMock.userRole.findMany.mockResolvedValue([
        {
          role: {
            permissions: [
              { permission: { code: 'students:read' } },
              { permission: { code: 'grades:read' } },
            ],
          },
        },
      ]);
      prismaMock.globalUserRole.findMany.mockResolvedValue([]);

      const result = await service.hasAllPermissions('user-1', 'inst-1', [
        'students:read',
        'grades:read',
      ]);

      expect(result).toBe(true);
    });

    it('should return false when user is missing a permission', async () => {
      prismaMock.userRole.findMany.mockResolvedValue([
        {
          role: {
            permissions: [{ permission: { code: 'students:read' } }],
          },
        },
      ]);
      prismaMock.globalUserRole.findMany.mockResolvedValue([]);

      const result = await service.hasAllPermissions('user-1', 'inst-1', [
        'students:read',
        'grades:read',
      ]);

      expect(result).toBe(false);
    });
  });

  describe('getUserRoles', () => {
    it('should return tenant roles for a user', async () => {
      prismaMock.userRole.findMany.mockResolvedValue([
        { role: { id: 'role-1', name: 'TEACHER', roleType: RoleType.TENANT } },
      ]);

      const result = await service.getUserRoles('user-1', 'inst-1');

      expect(result).toEqual([
        { id: 'role-1', name: 'TEACHER', roleType: RoleType.TENANT },
      ]);
    });

    it('should return empty array for user with no tenant roles', async () => {
      prismaMock.userRole.findMany.mockResolvedValue([]);

      const result = await service.getUserRoles('user-1', 'inst-1');

      expect(result).toEqual([]);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the role', async () => {
      prismaMock.userRole.findMany.mockResolvedValue([
        { role: { id: 'role-1', name: 'TEACHER', roleType: RoleType.TENANT } },
      ]);

      const result = await service.hasRole('user-1', 'inst-1', 'TEACHER');

      expect(result).toBe(true);
    });

    it('should return false when user lacks the role', async () => {
      prismaMock.userRole.findMany.mockResolvedValue([
        { role: { id: 'role-1', name: 'STUDENT', roleType: RoleType.TENANT } },
      ]);

      const result = await service.hasRole('user-1', 'inst-1', 'TEACHER');

      expect(result).toBe(false);
    });
  });

  describe('getGlobalPermissionCodes', () => {
    it('should return global permissions for super admin', async () => {
      prismaMock.globalUserRole.findMany.mockResolvedValue([
        {
          role: {
            permissions: [
              { permission: { code: 'audit:read' } },
              { permission: { code: 'users:read' } },
            ],
          },
        },
      ]);

      const result = await service.getGlobalPermissionCodes('superadmin-1');

      expect(result).toContain('audit:read');
      expect(result).toContain('users:read');
    });

    it('should return empty array for user without global roles', async () => {
      prismaMock.globalUserRole.findMany.mockResolvedValue([]);

      const result = await service.getGlobalPermissionCodes('user-1');

      expect(result).toEqual([]);
    });
  });
});
