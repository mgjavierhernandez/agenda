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
import { TasksService } from './tasks.service';
import { FilesService } from '../files/files.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { CreateTaskAttachmentDto } from './dto/create-task-attachment.dto';

@ApiTags('Tasks')
@ApiBearerAuth('bearer')
@Controller('tasks')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly filesService: FilesService,
  ) {}

  @Post()
  @RequirePermission('tasks:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(
      req.tenant!.institutionId,
      createTaskDto,
      req.user.userId,
      req.ip,
    );
  }

  @Get()
  @RequirePermission('tasks:read')
  @ApiOperation({ summary: 'List tasks with optional filters' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by title or description' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiQuery({ name: 'courseId', required: false, type: String, description: 'Filter by course ID' })
  @ApiQuery({ name: 'subjectId', required: false, type: String, description: 'Filter by subject ID' })
  @ApiQuery({ name: 'dueDateFrom', required: false, type: String, description: 'Filter by due date from' })
  @ApiQuery({ name: 'dueDateTo', required: false, type: String, description: 'Filter by due date to' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListTasksQueryDto,
  ) {
    return this.tasksService.findAll(
      req.tenant!.institutionId,
      query,
      req.user.userId,
    );
  }

  @Get(':id')
  @RequirePermission('tasks:read')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task found' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.findOne(
      req.tenant!.institutionId,
      id,
      req.user.userId,
    );
  }

  @Patch(':id')
  @RequirePermission('tasks:manage')
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(
      req.tenant!.institutionId,
      id,
      updateTaskDto,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/publish')
  @RequirePermission('tasks:manage')
  @ApiOperation({ summary: 'Publish a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task published successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async publish(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.publish(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/close')
  @RequirePermission('tasks:manage')
  @ApiOperation({ summary: 'Close a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task closed successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async close(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.close(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/deactivate')
  @RequirePermission('tasks:manage')
  @ApiOperation({ summary: 'Deactivate a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async deactivate(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.deactivate(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Post(':id/attachments')
  @RequirePermission('tasks:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a task attachment' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 201, description: 'Attachment created successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async createAttachment(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTaskAttachmentDto,
  ) {
    return this.filesService.createTaskAttachment(
      req.tenant!.institutionId,
      id,
      dto.fileAssetId,
      req.user.userId,
      req.ip,
    );
  }

  @Get(':id/attachments')
  @RequirePermission('tasks:read')
  @ApiOperation({ summary: 'List attachments for a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Attachments retrieved successfully' })
  async listAttachments(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.listTaskAttachments(
      req.tenant!.institutionId,
      id,
    );
  }

  @Delete(':id/attachments/:attachmentId')
  @RequirePermission('tasks:manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a task attachment' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment UUID' })
  @ApiResponse({ status: 200, description: 'Attachment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task or attachment not found' })
  async deleteAttachment(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.filesService.deleteTaskAttachment(
      req.tenant!.institutionId,
      id,
      attachmentId,
      req.user.userId,
      req.ip,
    );
  }
}
