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
import {
  TenantContextGuard,
  AuthenticatedRequest,
} from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { AgendaEventsService } from './agenda-events.service';
import { CreateAgendaEventDto } from './dto/create-agenda-event.dto';
import { UpdateAgendaEventDto } from './dto/update-agenda-event.dto';
import { ListAgendaEventsQueryDto } from './dto/list-agenda-events-query.dto';
import { AgendaEventStatus, CommunicationAudience } from '@prisma/client';

@ApiTags('Agenda Events')
@ApiBearerAuth('bearer')
@Controller('agenda/events')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class AgendaEventsController {
  constructor(private readonly service: AgendaEventsService) {}

  @Post()
  @RequirePermission('agenda:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom agenda event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid dates (endAt must be after startAt)' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateAgendaEventDto) {
    return this.service.create(
      req.tenant!.institutionId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Get()
  @RequirePermission('agenda:read')
  @ApiOperation({ summary: 'List custom agenda events' })
  @ApiQuery({ name: 'start', required: false, type: String, description: 'Only events ending at/after this datetime' })
  @ApiQuery({ name: 'end', required: false, type: String, description: 'Only events starting at/before this datetime' })
  @ApiQuery({ name: 'status', required: false, enum: AgendaEventStatus })
  @ApiQuery({ name: 'audience', required: false, enum: CommunicationAudience })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of events' })
  async findAll(@Request() req: AuthenticatedRequest, @Query() query: ListAgendaEventsQueryDto) {
    return this.service.findAll(
      req.tenant!.institutionId,
      query,
      req.user.userId,
    );
  }

  @Get(':id')
  @RequirePermission('agenda:read')
  @ApiOperation({ summary: 'Get a custom agenda event by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Event found' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(
      req.tenant!.institutionId,
      id,
      req.user.userId,
    );
  }

  @Patch(':id')
  @RequirePermission('agenda:update')
  @ApiOperation({ summary: 'Update a custom agenda event' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 400, description: 'Invalid dates or cancelled event' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgendaEventDto,
  ) {
    return this.service.update(
      req.tenant!.institutionId,
      id,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Delete(':id')
  @RequirePermission('agenda:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel (soft-delete) a custom agenda event' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Event cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 400, description: 'Event is already cancelled' })
  async cancel(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }
}