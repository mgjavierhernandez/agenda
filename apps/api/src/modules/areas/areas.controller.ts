import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { ListAreasQueryDto } from './dto/list-areas-query.dto';

@ApiTags('Areas')
@ApiBearerAuth('bearer')
@Controller('areas')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  @RequirePermission('areas:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new area' })
  @ApiResponse({ status: 201, description: 'Area created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Conflict' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateAreaDto) {
    return this.areasService.create(req.tenant!.institutionId, dto, req.user.userId, req.ip);
  }

  @Get()
  @RequirePermission('areas:read')
  @ApiOperation({ summary: 'List all areas' })
  @ApiResponse({ status: 200, description: 'Areas retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findAll(@Request() req: AuthenticatedRequest, @Query() query: ListAreasQueryDto) {
    return this.areasService.findAll(req.tenant!.institutionId, query);
  }

  @Get(':id')
  @RequirePermission('areas:read')
  @ApiOperation({ summary: 'Get an area by ID' })
  @ApiParam({ name: 'id', description: 'Area ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Area retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.areasService.findOne(req.tenant!.institutionId, id);
  }

  @Patch(':id')
  @RequirePermission('areas:manage')
  @ApiOperation({ summary: 'Update an area' })
  @ApiParam({ name: 'id', description: 'Area ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Area updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async update(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAreaDto) {
    return this.areasService.update(req.tenant!.institutionId, id, dto, req.user.userId, req.ip);
  }

  @Patch(':id/deactivate')
  @RequirePermission('areas:manage')
  @ApiOperation({ summary: 'Deactivate an area' })
  @ApiParam({ name: 'id', description: 'Area ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Area deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async deactivate(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.areasService.deactivate(req.tenant!.institutionId, id, req.user.userId, req.ip);
  }
}