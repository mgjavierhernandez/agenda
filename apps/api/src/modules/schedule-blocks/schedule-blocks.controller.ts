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
import { ScheduleBlocksService } from './schedule-blocks.service';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto';
import { UpdateScheduleBlockDto } from './dto/update-schedule-block.dto';
import { ListScheduleBlocksQueryDto } from './dto/list-schedule-blocks-query.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Schedule Blocks')
@ApiBearerAuth('bearer')
@Controller('schedule-blocks')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class ScheduleBlocksController {
  constructor(private readonly scheduleBlocksService: ScheduleBlocksService) {}

  @ApiOperation({ summary: 'Create a schedule block (configurable time slot)' })
  @ApiResponse({ status: 201, description: 'Schedule block created' })
  @ApiResponse({ status: 409, description: 'Block name already exists for this day' })
  @Post()
  @RequirePermission('schedules:manage')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateScheduleBlockDto,
  ) {
    return this.scheduleBlocksService.create(
      req.tenant!.institutionId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @ApiOperation({ summary: 'List schedule blocks' })
  @ApiResponse({ status: 200, description: 'Paginated list of schedule blocks' })
  @Get()
  @RequirePermission('schedules:read')
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListScheduleBlocksQueryDto,
  ) {
    return this.scheduleBlocksService.findAll(
      req.tenant!.institutionId,
      query,
    );
  }

  @ApiOperation({ summary: 'Get schedule block by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Schedule block found' })
  @ApiResponse({ status: 404, description: 'Schedule block not found' })
  @Get(':id')
  @RequirePermission('schedules:read')
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.scheduleBlocksService.findOne(
      req.tenant!.institutionId,
      id,
    );
  }

  @ApiOperation({ summary: 'Update schedule block' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Schedule block updated' })
  @ApiResponse({ status: 404, description: 'Schedule block not found' })
  @Patch(':id')
  @RequirePermission('schedules:manage')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleBlockDto,
  ) {
    return this.scheduleBlocksService.update(
      req.tenant!.institutionId,
      id,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @ApiOperation({ summary: 'Deactivate schedule block' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Schedule block deactivated' })
  @ApiResponse({ status: 404, description: 'Schedule block not found' })
  @Patch(':id/deactivate')
  @RequirePermission('schedules:manage')
  async deactivate(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.scheduleBlocksService.deactivate(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }
}
