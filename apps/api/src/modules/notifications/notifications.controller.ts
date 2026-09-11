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
import { AuthorizationService } from '../auth/authorization/authorization.service';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

@ApiTags('Notifications')
@ApiBearerAuth('bearer')
@Controller('notifications')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Post()
  @RequirePermission('notifications:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(
      req.tenant!.institutionId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Get()
  @RequirePermission('notifications:read')
  @ApiOperation({ summary: 'List notifications with optional filters' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by title or message' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter by type' })
  @ApiQuery({ name: 'createdFrom', required: false, type: String, description: 'Filter by created date from' })
  @ApiQuery({ name: 'createdTo', required: false, type: String, description: 'Filter by created date to' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.findAll(
      req.tenant!.institutionId,
      req.user.userId,
      query,
    );
  }

  @Get(':id')
  @RequirePermission('notifications:read')
  @ApiOperation({ summary: 'Get a notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification found' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.findOne(
      req.tenant!.institutionId,
      id,
      req.user.userId,
    );
  }

  @Patch(':id')
  @RequirePermission('notifications:read')
  @ApiOperation({ summary: 'Update or mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification updated successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    if (dto.status !== undefined || dto.readAt !== undefined) {
      return this.notificationsService.markAsRead(
        req.tenant!.institutionId,
        id,
        req.user.userId,
        req.ip,
      );
    }
    return this.notificationsService.findOne(
      req.tenant!.institutionId,
      id,
      req.user.userId,
    );
  }

  @Patch()
  @RequirePermission('notifications:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(
      req.tenant!.institutionId,
      req.user.userId,
      req.ip,
    );
  }

  @Post(':id/opened')
  @RequirePermission('notifications:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track notification opening (first-view timestamp)' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Opening tracked successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async trackOpened(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.notificationsService.trackOpened(
      req.tenant!.institutionId,
      id,
      req.user.userId,
    );
    return { ok: true };
  }

  @Delete(':id')
  @RequirePermission('notifications:read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 204, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async delete(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.delete(
      req.tenant!.institutionId,
      id,
      req.user.userId,
    );
  }

  @Delete()
  @RequirePermission('notifications:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all notifications' })
  @ApiResponse({ status: 200, description: 'All notifications deleted successfully' })
  async deleteAll(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.deleteAll(
      req.tenant!.institutionId,
      req.user.userId,
    );
  }
}
