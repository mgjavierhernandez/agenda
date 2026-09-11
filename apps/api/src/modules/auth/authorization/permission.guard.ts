import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from './authorization.service';
import { REQUIRE_PERMISSION_KEY } from './require-permission.decorator';
import { AuthenticatedRequest } from '../tenant/tenant-context.guard';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user?.userId) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const institutionId = request.tenant?.institutionId;

    if (!institutionId) {
      const globalPermissions = await this.authorizationService.getGlobalPermissionCodes(
        request.user.userId,
      );
      const hasAll = requiredPermissions.every((p) => globalPermissions.includes(p));
      if (!hasAll) {
        throw new ForbiddenException('Forbidden');
      }
      return true;
    }

    const hasPermission = await this.authorizationService.hasAllPermissions(
      request.user.userId,
      institutionId,
      requiredPermissions,
    );

    if (!hasPermission) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}
