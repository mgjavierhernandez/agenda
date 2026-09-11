import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { RolesService } from './roles.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Roles')
@ApiBearerAuth('bearer')
@Controller('roles')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({ summary: 'List roles for the current institution' })
  @ApiResponse({ status: 200, description: 'List of tenant roles' })
  @Get()
  @RequirePermission('roles:read')
  async findAll(@Request() req: AuthenticatedRequest) {
    const institutionId = req.tenant!.institutionId;
    return this.rolesService.findAll(institutionId);
  }
}
