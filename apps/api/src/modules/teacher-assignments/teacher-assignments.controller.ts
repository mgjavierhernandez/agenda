import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { TeacherAssignmentsService } from './teacher-assignments.service';
import { CreateTeacherAssignmentDto } from './dto/create-teacher-assignment.dto';
import { UpdateTeacherAssignmentDto } from './dto/update-teacher-assignment.dto';
import { ListTeacherAssignmentsQueryDto } from './dto/list-teacher-assignments-query.dto';

@ApiTags('Teacher Assignments')
@ApiBearerAuth('bearer')
@Controller('teacher-assignments')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class TeacherAssignmentsController {
  constructor(private readonly teacherAssignmentsService: TeacherAssignmentsService) {}

  @Post()
  @RequirePermission('teacher-assignments:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new teacher assignment' })
  @ApiResponse({ status: 201, description: 'Teacher assignment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Conflict' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateTeacherAssignmentDto) {
    return this.teacherAssignmentsService.create(req.tenant!.institutionId, dto, req.user.userId, req.ip);
  }

  @Get()
  @RequirePermission('teacher-assignments:read')
  @ApiOperation({ summary: 'List all teacher assignments' })
  @ApiResponse({ status: 200, description: 'Teacher assignments retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findAll(@Request() req: AuthenticatedRequest, @Query() query: ListTeacherAssignmentsQueryDto) {
    return this.teacherAssignmentsService.findAll(req.tenant!.institutionId, query);
  }

  @Get(':id')
  @RequirePermission('teacher-assignments:read')
  @ApiOperation({ summary: 'Get a teacher assignment by ID' })
  @ApiParam({ name: 'id', description: 'Teacher Assignment ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Teacher assignment retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Teacher assignment not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacherAssignmentsService.findOne(req.tenant!.institutionId, id);
  }

  @Patch(':id')
  @RequirePermission('teacher-assignments:manage')
  @ApiOperation({ summary: 'Update a teacher assignment' })
  @ApiParam({ name: 'id', description: 'Teacher Assignment ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Teacher assignment updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Teacher assignment not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async update(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTeacherAssignmentDto) {
    return this.teacherAssignmentsService.update(req.tenant!.institutionId, id, dto, req.user.userId, req.ip);
  }

  @Patch(':id/deactivate')
  @RequirePermission('teacher-assignments:manage')
  @ApiOperation({ summary: 'Deactivate a teacher assignment' })
  @ApiParam({ name: 'id', description: 'Teacher Assignment ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Teacher assignment deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Teacher assignment not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async deactivate(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacherAssignmentsService.deactivate(req.tenant!.institutionId, id, req.user.userId, req.ip);
  }
}
