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
  Res,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ListSchedulesQueryDto } from './dto/list-schedules-query.dto';
import { ScheduleExportQueryDto } from './dto/schedule-export-query.dto';

@ApiTags('Schedules')
@ApiBearerAuth('bearer')
@Controller('schedules')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @RequirePermission('schedules:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Conflict' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async create(@Request() req: AuthenticatedRequest, @Body() createScheduleDto: CreateScheduleDto) {
    return this.schedulesService.create(
      req.tenant!.institutionId,
      createScheduleDto,
      req.user.userId,
      req.ip,
    );
  }

  @Get()
  @RequirePermission('schedules:read')
  @ApiOperation({ summary: 'List all schedules' })
  @ApiResponse({ status: 200, description: 'Schedules retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findAll(@Request() req: AuthenticatedRequest, @Query() query: ListSchedulesQueryDto) {
    return this.schedulesService.findAll(req.tenant!.institutionId, query, req.user.userId);
  }

  @Get('export')
  @RequirePermission('schedules:read')
  @ApiOperation({ summary: 'Export scoped schedules as PDF, XLSX or CSV' })
  @ApiResponse({ status: 200, description: 'File download' })
  @ApiResponse({ status: 400, description: 'Invalid format' })
  async exportSchedules(
    @Request() req: AuthenticatedRequest,
    @Query() query: ScheduleExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.schedulesService.exportSchedules(
      req.tenant!.institutionId,
      req.user.userId,
      query,
      req.ip,
    );
    const safeFilename = result.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(result.buffer);
  }

  @Get(':id')
  @RequirePermission('schedules:read')
  @ApiOperation({ summary: 'Get a schedule by ID' })
  @ApiParam({ name: 'id', description: 'Schedule ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Schedule retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.schedulesService.findOne(req.tenant!.institutionId, id, req.user.userId);
  }

  @Patch(':id')
  @RequirePermission('schedules:manage')
  @ApiOperation({ summary: 'Update a schedule' })
  @ApiParam({ name: 'id', description: 'Schedule ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Schedule updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(
      req.tenant!.institutionId,
      id,
      updateScheduleDto,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/deactivate')
  @RequirePermission('schedules:manage')
  @ApiOperation({ summary: 'Deactivate a schedule' })
  @ApiParam({ name: 'id', description: 'Schedule ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Schedule deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async deactivate(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.schedulesService.deactivate(req.tenant!.institutionId, id, req.user.userId, req.ip);
  }
}
