import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { TenantContextService, TenantContext } from './tenant-context.service';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: { userId: string };
  tenant?: TenantContext;
}

@Injectable()
export class OptionalTenantContextGuard implements CanActivate {
  constructor(private readonly tenantContextService: TenantContextService) {}

  async canActivate(executionContext: ExecutionContext): Promise<boolean> {
    const request = executionContext.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user?.userId) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const institutionId = request.headers['x-institution-id'];

    // Optional: when no institution context is provided, the request is
    // treated as global (e.g. platform super-admin operations).
    if (!institutionId || typeof institutionId !== 'string') {
      return true;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(institutionId)) {
      throw new ForbiddenException('Invalid institution ID format');
    }

    const tenantCtx = await this.tenantContextService.validateTenantAccess(
      request.user.userId,
      institutionId,
    );

    request.tenant = tenantCtx;

    return true;
  }
}
