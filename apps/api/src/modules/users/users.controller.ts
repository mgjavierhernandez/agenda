import {
  Controller,
  Get,
  Post,
  Patch,
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
import { AuthorizationService } from '../auth/authorization/authorization.service';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ListUsersQueryDto } from './dto/user.dto';
import { UpsertUserProfileDto } from './dto/user-profile.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ForbiddenException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth('bearer')
@Controller('users')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  /**
   * Perfil propio: cualquier miembro activo puede leer/actualizar SU perfil
   * sin permisos administrativos. Para terceros se exige users:read/update.
   */
  private async assertProfileAccess(
    callerUserId: string,
    targetUserId: string,
    institutionId: string,
    permission: string,
  ): Promise<void> {
    if (callerUserId === targetUserId) return;
    const allowed = await this.authorizationService.hasPermission(
      callerUserId,
      institutionId,
      permission,
    );
    if (!allowed) {
      throw new ForbiddenException('Access denied');
    }
  }

  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiBody({ type: CreateUserDto })
  @Post()
  @RequirePermission('users:create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateUserDto) {
    return this.usersService.create(req.tenant!.institutionId, dto, req.user.userId, req.ip);
  }

  @ApiOperation({ summary: 'List users' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  @Get()
  @RequirePermission('users:read')
  async findAll(@Request() req: AuthenticatedRequest, @Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(req.tenant!.institutionId, query);
  }

  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id')
  @RequirePermission('users:read')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(req.tenant!.institutionId, id);
  }

  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Patch(':id')
  @RequirePermission('users:update')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(req.tenant!.institutionId, id, dto, req.user.userId, req.ip);
  }

  @ApiOperation({ summary: 'Get tenant-scoped profile of a user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User profile found (null when not set)' })
  @ApiResponse({ status: 404, description: 'User not found in this institution' })
  @Get(':id/profile')
  async findProfile(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.assertProfileAccess(req.user.userId, id, req.tenant!.institutionId, 'users:read');
    return this.usersService.findProfile(req.tenant!.institutionId, id);
  }

  @ApiOperation({ summary: 'Create or update the tenant-scoped profile of a user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User profile upserted' })
  @ApiResponse({ status: 404, description: 'User not found in this institution' })
  @ApiResponse({ status: 409, description: 'Document already registered in this institution' })
  @ApiBody({ type: UpsertUserProfileDto })
  @Patch(':id/profile')
  async upsertProfile(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertUserProfileDto,
  ) {
    await this.assertProfileAccess(req.user.userId, id, req.tenant!.institutionId, 'users:update');
    return this.usersService.upsertProfile(
      req.tenant!.institutionId,
      id,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @ApiOperation({ summary: 'Deactivate user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Patch(':id/deactivate')
  @RequirePermission('users:delete')
  async deactivate(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deactivate(req.tenant!.institutionId, id, req.user.userId, req.ip);
  }
}
