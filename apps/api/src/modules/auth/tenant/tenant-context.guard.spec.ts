import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantContextService } from './tenant-context.service';
import { ExecutionContext } from '@nestjs/common';

describe('TenantContextGuard', () => {
  let guard: TenantContextGuard;
  let tenantContextServiceMock: jest.Mocked<TenantContextService>;

  beforeEach(() => {
    tenantContextServiceMock = {
      validateTenantAccess: jest.fn(),
      getUserInstitutions: jest.fn(),
      getInstitutionForContext: jest.fn(),
    } as unknown as jest.Mocked<TenantContextService>;

    guard = new TenantContextGuard(tenantContextServiceMock);
  });

  const createMockContext = (headers: Record<string, string>, user?: { userId: string }) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow access with valid institution header and active membership', async () => {
      const context = createMockContext(
        { 'x-institution-id': '123e4567-e89b-12d3-a456-426614174000' },
        { userId: 'user-1' },
      );

      tenantContextServiceMock.validateTenantAccess.mockResolvedValue({
        institutionId: '123e4567-e89b-12d3-a456-426614174000',
        userInstitutionId: 'membership-1',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(tenantContextServiceMock.validateTenantAccess).toHaveBeenCalledWith(
        'user-1',
        '123e4567-e89b-12d3-a456-426614174000',
      );
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      const context = createMockContext(
        { 'x-institution-id': '123e4567-e89b-12d3-a456-426614174000' },
        undefined,
      );

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when institution header is missing', async () => {
      const context = createMockContext({}, { userId: 'user-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when institution header is empty', async () => {
      const context = createMockContext({ 'x-institution-id': '' }, { userId: 'user-1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for invalid UUID format', async () => {
      const context = createMockContext(
        { 'x-institution-id': 'invalid-uuid' },
        { userId: 'user-1' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when membership is inactive', async () => {
      const context = createMockContext(
        { 'x-institution-id': '123e4567-e89b-12d3-a456-426614174000' },
        { userId: 'user-1' },
      );

      tenantContextServiceMock.validateTenantAccess.mockRejectedValue(
        new ForbiddenException('Membership is not active'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when institution is inactive', async () => {
      const context = createMockContext(
        { 'x-institution-id': '123e4567-e89b-12d3-a456-426614174000' },
        { userId: 'user-1' },
      );

      tenantContextServiceMock.validateTenantAccess.mockRejectedValue(
        new ForbiddenException('Institution is not active'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user has no access to institution', async () => {
      const context = createMockContext(
        { 'x-institution-id': '123e4567-e89b-12d3-a456-426614174000' },
        { userId: 'user-1' },
      );

      tenantContextServiceMock.validateTenantAccess.mockRejectedValue(
        new ForbiddenException('Access denied to this institution'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should attach tenant context to request on success', async () => {
      const mockRequest = {
        headers: { 'x-institution-id': '123e4567-e89b-12d3-a456-426614174000' },
        user: { userId: 'user-1' },
        tenant: undefined as { institutionId: string; userInstitutionId: string } | undefined,
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as unknown as ExecutionContext;

      const tenantCtx = {
        institutionId: '123e4567-e89b-12d3-a456-426614174000',
        userInstitutionId: 'membership-1',
      };

      tenantContextServiceMock.validateTenantAccess.mockResolvedValue(tenantCtx);

      await guard.canActivate(context);

      expect(mockRequest.tenant).toEqual(tenantCtx);
    });
  });
});
