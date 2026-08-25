import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
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
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { TaskSubmissionsService } from './task-submissions.service';
import { CreateSubmissionDto, UpdateSubmissionDto, GradeSubmissionDto } from './dto/task-submission.dto';

@ApiTags('Task Submissions')
@ApiBearerAuth('bearer')
@Controller('task-assignments')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class TaskSubmissionsController {
  constructor(private readonly taskSubmissionsService: TaskSubmissionsService) {}

  @Post(':id/submission')
  @RequirePermission('tasks:read')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a submission for a task assignment' })
  @ApiParam({ name: 'id', description: 'Task assignment UUID' })
  @ApiResponse({ status: 201, description: 'Submission created successfully' })
  @ApiResponse({ status: 404, description: 'Task assignment not found' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.taskSubmissionsService.create(
      req.tenant!.institutionId,
      id,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Get(':id/submission')
  @RequirePermission('tasks:read')
  @ApiOperation({ summary: 'Get submission for a task assignment' })
  @ApiParam({ name: 'id', description: 'Task assignment UUID' })
  @ApiResponse({ status: 200, description: 'Submission found' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.taskSubmissionsService.findByAssignment(
      req.tenant!.institutionId,
      id,
    );
  }

  @Patch(':id/submission')
  @RequirePermission('tasks:read')
  @ApiOperation({ summary: 'Update a submission for a task assignment' })
  @ApiParam({ name: 'id', description: 'Task assignment UUID' })
  @ApiResponse({ status: 200, description: 'Submission updated successfully' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubmissionDto,
  ) {
    const submission = await this.taskSubmissionsService.findByAssignment(
      req.tenant!.institutionId,
      id,
    );
    return this.taskSubmissionsService.update(
      req.tenant!.institutionId,
      submission.id,
      dto,
      req.user.userId,
      req.ip,
    );
  }
}

@ApiTags('Task Submissions')
@ApiBearerAuth('bearer')
@Controller('submissions')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class SubmissionsGradingController {
  constructor(private readonly taskSubmissionsService: TaskSubmissionsService) {}

  @Patch(':id/grade')
  @RequirePermission('grades:manage')
  @ApiOperation({ summary: 'Grade a submission' })
  @ApiParam({ name: 'id', description: 'Submission UUID' })
  @ApiResponse({ status: 200, description: 'Submission graded successfully' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async grade(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.taskSubmissionsService.grade(
      req.tenant!.institutionId,
      id,
      dto,
      req.user.userId,
      req.ip,
    );
  }
}
