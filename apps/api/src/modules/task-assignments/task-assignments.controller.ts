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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { TaskAssignmentsService } from './task-assignments.service';
import { CreateTaskAssignmentDto, UpdateTaskAssignmentDto, ListTaskAssignmentsQueryDto } from './dto/task-assignment.dto';

@ApiTags('Task Assignments')
@ApiBearerAuth('bearer')
@Controller('task-assignments')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class TaskAssignmentsController {
  constructor(private readonly taskAssignmentsService: TaskAssignmentsService) {}

  @Post()
  @RequirePermission('tasks:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a task assignment' })
  @ApiResponse({ status: 201, description: 'Task assignment created successfully' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateTaskAssignmentDto,
  ) {
    return this.taskAssignmentsService.create(
      req.tenant!.institutionId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Get()
  @RequirePermission('tasks:read')
  @ApiOperation({ summary: 'List task assignments with optional filters' })
  @ApiResponse({ status: 200, description: 'Task assignments retrieved successfully' })
  @ApiQuery({ name: 'taskId', required: false, type: String, description: 'Filter by task ID' })
  @ApiQuery({ name: 'studentId', required: false, type: String, description: 'Filter by student ID' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListTaskAssignmentsQueryDto,
  ) {
    return this.taskAssignmentsService.findAll(
      req.tenant!.institutionId,
      query,
      req.user.userId,
    );
  }

  @Get(':id')
  @RequirePermission('tasks:read')
  @ApiOperation({ summary: 'Get a task assignment by ID' })
  @ApiParam({ name: 'id', description: 'Task assignment UUID' })
  @ApiResponse({ status: 200, description: 'Task assignment found' })
  @ApiResponse({ status: 404, description: 'Task assignment not found' })
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.taskAssignmentsService.findOne(
      req.tenant!.institutionId,
      id,
      req.user.userId,
    );
  }

  @Post(':id/opened')
  @RequirePermission('tasks:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record that the current user opened a task assignment (trazabilidad)' })
  @ApiParam({ name: 'id', description: 'Task assignment UUID' })
  @ApiResponse({ status: 200, description: 'Opening recorded' })
  @ApiResponse({ status: 404, description: 'Task assignment not found' })
  async markOpened(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.taskAssignmentsService.markOpened(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id')
  @RequirePermission('tasks:manage')
  @ApiOperation({ summary: 'Update a task assignment' })  @ApiParam({ name: 'id', description: 'Task assignment UUID' })
  @ApiResponse({ status: 200, description: 'Task assignment updated successfully' })
  @ApiResponse({ status: 404, description: 'Task assignment not found' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskAssignmentDto,
  ) {
    return this.taskAssignmentsService.update(
      req.tenant!.institutionId,
      id,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/deactivate')
  @RequirePermission('tasks:manage')
  @ApiOperation({ summary: 'Deactivate a task assignment' })
  @ApiParam({ name: 'id', description: 'Task assignment UUID' })
  @ApiResponse({ status: 200, description: 'Task assignment deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Task assignment not found' })
  async deactivate(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.taskAssignmentsService.deactivate(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }
}
