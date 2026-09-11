import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { MembershipsService } from './memberships.service';
import {
  LinkUserDto,
  UpdateMembershipDto,
  AssignRoleDto,
  ListMembershipsQueryDto,
} from './dto/membership.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Memberships')
@ApiBearerAuth('bearer')
@Controller('institutions/:institutionId/memberships')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @ApiOperation({ summary: 'Link user to institution' })
  @ApiParam({ name: 'institutionId', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'User linked' })
  @ApiResponse({ status: 409, description: 'User already linked' })
  @Post()
  @RequirePermission('memberships:manage')
  @HttpCode(HttpStatus.CREATED)
  async linkUser(
    @Request() req: AuthenticatedRequest,
    @Param('institutionId', ParseUUIDPipe) _institutionId: string,
    @Body() dto: LinkUserDto,
  ) {
    const institutionId = req.tenant!.institutionId;
    return this.membershipsService.linkUser(institutionId, dto, req.user.userId, req.ip);
  }

  @ApiOperation({ summary: 'List memberships' })
  @ApiParam({ name: 'institutionId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Paginated list of memberships' })
  @Get()
  @RequirePermission('memberships:read')
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Param('institutionId', ParseUUIDPipe) _institutionId: string,
    @Query() query: ListMembershipsQueryDto,
  ) {
    const institutionId = req.tenant!.institutionId;
    return this.membershipsService.findAll(institutionId, query);
  }

  @ApiOperation({ summary: 'Get membership by ID' })
  @ApiParam({ name: 'institutionId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Membership found' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  @Get(':id')
  @RequirePermission('memberships:read')
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('institutionId', ParseUUIDPipe) _institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const institutionId = req.tenant!.institutionId;
    return this.membershipsService.findOne(institutionId, id);
  }

  @ApiOperation({ summary: 'Update membership status' })
  @ApiParam({ name: 'institutionId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Membership updated' })
  @Patch(':id')
  @RequirePermission('memberships:manage')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('institutionId', ParseUUIDPipe) _institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    const institutionId = req.tenant!.institutionId;
    return this.membershipsService.update(institutionId, id, dto, req.user.userId, req.ip);
  }

  @ApiOperation({ summary: 'Approve a PENDING membership request' })
  @ApiParam({ name: 'institutionId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Membership approved' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  @ApiResponse({ status: 409, description: 'Membership is not PENDING' })
  @Post(':id/approve')
  @RequirePermission('memberships:manage')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Request() req: AuthenticatedRequest,
    @Param('institutionId', ParseUUIDPipe) _institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const institutionId = req.tenant!.institutionId;
    return this.membershipsService.approve(institutionId, id, req.user.userId, req.ip);
  }

  @ApiOperation({ summary: 'Reject a PENDING membership request' })
  @ApiParam({ name: 'institutionId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Membership rejected' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  @ApiResponse({ status: 409, description: 'Membership is not PENDING' })
  @Post(':id/reject')
  @RequirePermission('memberships:manage')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Request() req: AuthenticatedRequest,
    @Param('institutionId', ParseUUIDPipe) _institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const institutionId = req.tenant!.institutionId;
    return this.membershipsService.reject(institutionId, id, req.user.userId, req.ip);
  }

  @ApiOperation({ summary: 'Unlink user from institution' })
  @ApiParam({ name: 'institutionId', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User unlinked' })
  @Delete('user/:userId')
  @RequirePermission('memberships:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkUser(
    @Request() req: AuthenticatedRequest,
    @Param('institutionId', ParseUUIDPipe) _institutionId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const institutionId = req.tenant!.institutionId;
    return this.membershipsService.unlinkUser(institutionId, userId, req.user.userId, req.ip);
  }

  @ApiOperation({ summary: 'Assign role to user' })
  @ApiParam({ name: 'institutionId', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Role assigned' })
  @ApiResponse({ status: 409, description: 'Role already assigned' })
  @Post('user/:userId/roles')
  @RequirePermission('memberships:manage')
  @HttpCode(HttpStatus.CREATED)
  async assignRole(
    @Request() req: AuthenticatedRequest,
    @Param('institutionId', ParseUUIDPipe) _institutionId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    const institutionId = req.tenant!.institutionId;
    return this.membershipsService.assignRole(institutionId, userId, dto, req.user.userId, req.ip);
  }

  @ApiOperation({ summary: 'Remove role from user' })
  @ApiParam({ name: 'institutionId', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiParam({ name: 'roleId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Role removed' })
  @Delete('user/:userId/roles/:roleId')
  @RequirePermission('memberships:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRole(
    @Request() req: AuthenticatedRequest,
    @Param('institutionId', ParseUUIDPipe) _institutionId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    const institutionId = req.tenant!.institutionId;
    return this.membershipsService.removeRole(
      institutionId,
      userId,
      roleId,
      req.user.userId,
      req.ip,
    );
  }
}
