import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { SchoolGradesService } from './school-grades.service';
import { CreateSchoolGradeDto } from './dto/create-school-grade.dto';
import { UpdateSchoolGradeDto } from './dto/update-school-grade.dto';
import { ListSchoolGradesQueryDto } from './dto/list-school-grades-query.dto';

@ApiTags('School Grades')
@ApiBearerAuth('bearer')
@Controller('school-grades')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class SchoolGradesController {
  constructor(private readonly schoolGradesService: SchoolGradesService) {}

  @Post()
  @RequirePermission('school-grades:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new school grade' })
  @ApiResponse({ status: 201, description: 'School grade created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Conflict' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateSchoolGradeDto) {
    return this.schoolGradesService.create(req.tenant!.institutionId, dto, req.user.userId, req.ip);
  }

  @Get()
  @RequirePermission('school-grades:read')
  @ApiOperation({ summary: 'List all school grades' })
  @ApiResponse({ status: 200, description: 'School grades retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findAll(@Request() req: AuthenticatedRequest, @Query() query: ListSchoolGradesQueryDto) {
    return this.schoolGradesService.findAll(req.tenant!.institutionId, query);
  }

  @Get(':id')
  @RequirePermission('school-grades:read')
  @ApiOperation({ summary: 'Get a school grade by ID' })
  @ApiParam({ name: 'id', description: 'School Grade ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'School grade retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'School grade not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.schoolGradesService.findOne(req.tenant!.institutionId, id);
  }

  @Patch(':id')
  @RequirePermission('school-grades:manage')
  @ApiOperation({ summary: 'Update a school grade' })
  @ApiParam({ name: 'id', description: 'School Grade ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'School grade updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'School grade not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async update(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSchoolGradeDto) {
    return this.schoolGradesService.update(req.tenant!.institutionId, id, dto, req.user.userId, req.ip);
  }

  @Patch(':id/deactivate')
  @RequirePermission('school-grades:manage')
  @ApiOperation({ summary: 'Deactivate a school grade' })
  @ApiParam({ name: 'id', description: 'School Grade ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'School grade deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'School grade not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async deactivate(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.schoolGradesService.deactivate(req.tenant!.institutionId, id, req.user.userId, req.ip);
  }
}
