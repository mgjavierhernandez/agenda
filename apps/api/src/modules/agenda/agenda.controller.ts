import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { AgendaService } from './agenda.service';
import { ListAgendaQueryDto, AgendaView, AgendaEventType } from './dto/list-agenda-query.dto';

@ApiTags('Agenda')
@ApiBearerAuth('bearer')
@Controller('agenda')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  @RequirePermission('agenda:read')
  @ApiOperation({ summary: 'Get aggregated agenda events for a date range' })
  @ApiQuery({ name: 'start', required: true, type: String, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'end', required: true, type: String, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'view', required: false, enum: AgendaView, description: 'View mode' })
  @ApiQuery({
    name: 'eventTypes',
    required: false,
    enum: AgendaEventType,
    isArray: true,
    description: 'Filter by event types',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (max 500)',
  })
  @ApiResponse({ status: 200, description: 'Agenda events retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAgenda(@Request() req: AuthenticatedRequest, @Query() query: ListAgendaQueryDto) {
    return this.agendaService.getAgenda(req.tenant!.institutionId, req.user.userId, query);
  }
}
