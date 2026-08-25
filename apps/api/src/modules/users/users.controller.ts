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
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ListUsersQueryDto } from './dto/user.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth('bearer')
@Controller('users')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiBody({ type: CreateUserDto })
  @Post()
  @RequirePermission('users:create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(
      req.tenant!.institutionId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @ApiOperation({ summary: 'List users' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  @Get()
  @RequirePermission('users:read')
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.findAll(
      req.tenant!.institutionId,
      query,
    );
  }

  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id')
  @RequirePermission('users:read')
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findOne(
      req.tenant!.institutionId,
      id,
    );
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
    return this.usersService.update(
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
  async deactivate(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.deactivate(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }
}
