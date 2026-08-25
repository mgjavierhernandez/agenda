import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
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
import { CommunicationRecipientsService } from './communication-recipients.service';
import { ListRecipientsQueryDto } from './dto/communication-recipient.dto';

@ApiTags('Communication Recipients')
@ApiBearerAuth('bearer')
@Controller('communication-recipients')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class CommunicationRecipientsController {
  constructor(private readonly service: CommunicationRecipientsService) {}

  @Get()
  @RequirePermission('communications:read')
  @ApiOperation({ summary: 'List communication recipients with optional filters' })
  @ApiResponse({ status: 200, description: 'Recipients retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListRecipientsQueryDto,
  ) {
    return this.service.findAll(
      req.tenant!.institutionId,
      req.user.userId,
      query,
    );
  }

  @Get('unread-count')
  @RequirePermission('communications:read')
  @ApiOperation({ summary: 'Get unread communication count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getUnreadCount(
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.getUnreadCount(
      req.tenant!.institutionId,
      req.user.userId,
    );
  }

  @Patch('mark-all-read')
  @RequirePermission('communications:read')
  @ApiOperation({ summary: 'Mark all communications as read' })
  @ApiResponse({ status: 200, description: 'All communications marked as read' })
  async markAllAsRead(
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.markAllAsRead(
      req.tenant!.institutionId,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/read')
  @RequirePermission('communications:read')
  @ApiOperation({ summary: 'Mark a communication as read' })
  @ApiParam({ name: 'id', description: 'Communication recipient UUID' })
  @ApiResponse({ status: 200, description: 'Communication marked as read' })
  async markAsRead(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markAsRead(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }
}
