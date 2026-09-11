import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { AuthorizationService } from './authorization.service';
import { ExecutionContext } from '@nestjs/common';
import { REQUIRE_PERMISSION_KEY } from './require-permission.decorator';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let authorizationServiceMock: jest.Mocked<AuthorizationService>;
  let reflectorMock: Reflector;

  beforeEach(() => {
    authorizationServiceMock = {
      hasPermission: jest.fn(),
      hasAnyPermission: jest.fn(),
      hasAllPermissions: jest.fn(),
      getUserPermissionCodes: jest.fn(),
      getUserRoles: jest.fn(),
      hasRole: jest.fn(),
      getGlobalPermissionCodes: jest.fn(),
    } as unknown as jest.Mocked<AuthorizationService>;

    reflectorMock = new Reflector();
    guard = new PermissionGuard(reflectorMock, authorizationServiceMock);
  });

  const createMockContext = (
    user?: { userId: string },
    tenant?: { institutionId: string; userInstitutionId: string },
    handlerMetadata?: Record<string, unknown>,
  ) => {
    const handler = {
      getMetadata: () => handlerMetadata?.[REQUIRE_PERMISSION_KEY],
    };

    const classRef = {
      getMetadata: () => undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          tenant,
        }),
      }),
      getHandler: () => handler,
      getClass: () => classRef,
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow when no permissions are required', async () => {
      const context = createMockContext(
        { userId: 'user-1' },
        { institutionId: 'inst-1', userInstitutionId: 'ui-1' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      jest.spyOn(reflectorMock, 'getAllAndOverride').mockReturnValue(['students:read']);

      const context = createMockContext(undefined, {
        institutionId: 'inst-1',
        userInstitutionId: 'ui-1',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should check global permissions when tenant context is missing', async () => {
      jest.spyOn(reflectorMock, 'getAllAndOverride').mockReturnValue(['students:read']);
      authorizationServiceMock.getGlobalPermissionCodes.mockResolvedValue(['students:read']);

      const context = createMockContext({ userId: 'user-1' }, undefined);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when tenant is missing and no global permissions', async () => {
      jest.spyOn(reflectorMock, 'getAllAndOverride').mockReturnValue(['students:read']);
      authorizationServiceMock.getGlobalPermissionCodes.mockResolvedValue([]);

      const context = createMockContext({ userId: 'user-1' }, undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow when user has the required permission', async () => {
      jest.spyOn(reflectorMock, 'getAllAndOverride').mockReturnValue(['students:read']);

      authorizationServiceMock.hasAllPermissions.mockResolvedValue(true);

      const context = createMockContext(
        { userId: 'user-1' },
        { institutionId: 'inst-1', userInstitutionId: 'ui-1' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authorizationServiceMock.hasAllPermissions).toHaveBeenCalledWith('user-1', 'inst-1', [
        'students:read',
      ]);
    });

    it('should throw ForbiddenException when user lacks the required permission', async () => {
      jest.spyOn(reflectorMock, 'getAllAndOverride').mockReturnValue(['students:delete']);

      authorizationServiceMock.hasAllPermissions.mockResolvedValue(false);

      const context = createMockContext(
        { userId: 'user-1' },
        { institutionId: 'inst-1', userInstitutionId: 'ui-1' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should check multiple permissions with AND semantics', async () => {
      jest
        .spyOn(reflectorMock, 'getAllAndOverride')
        .mockReturnValue(['students:read', 'grades:read']);

      authorizationServiceMock.hasAllPermissions.mockResolvedValue(true);

      const context = createMockContext(
        { userId: 'user-1' },
        { institutionId: 'inst-1', userInstitutionId: 'ui-1' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authorizationServiceMock.hasAllPermissions).toHaveBeenCalledWith('user-1', 'inst-1', [
        'students:read',
        'grades:read',
      ]);
    });

    it('should deny when user has only some of multiple required permissions', async () => {
      jest
        .spyOn(reflectorMock, 'getAllAndOverride')
        .mockReturnValue(['students:read', 'students:delete']);

      authorizationServiceMock.hasAllPermissions.mockResolvedValue(false);

      const context = createMockContext(
        { userId: 'user-1' },
        { institutionId: 'inst-1', userInstitutionId: 'ui-1' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});
