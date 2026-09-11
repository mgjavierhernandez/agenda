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
import { CommunicationsService } from './communications.service';
import { FilesService } from '../files/files.service';
import { CreateCommunicationDto } from './dto/create-communication.dto';
import { UpdateCommunicationDto } from './dto/update-communication.dto';
import { ListCommunicationsQueryDto } from './dto/list-communications-query.dto';
import { CreateCommunicationAttachmentDto } from './dto/create-communication-attachment.dto';

@ApiTags('Communications')
@ApiBearerAuth('bearer')
@Controller('communications')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class CommunicationsController {
  constructor(
    private readonly communicationsService: CommunicationsService,
    private readonly authorizationService: AuthorizationService,
    private readonly filesService: FilesService,
  ) {}

  @Post()
  @RequirePermission('communications:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new communication' })
  @ApiResponse({ status: 201, description: 'Communication created successfully' })
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateCommunicationDto) {
    return this.communicationsService.create(
      req.tenant!.institutionId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Get()
  @RequirePermission('communications:read')
  @ApiOperation({ summary: 'List communications with optional filters' })
  @ApiResponse({ status: 200, description: 'Communications retrieved successfully' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by title or content',
  })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiQuery({ name: 'audience', required: false, type: String, description: 'Filter by audience' })
  @ApiQuery({
    name: 'publishedFrom',
    required: false,
    type: String,
    description: 'Filter by published date from',
  })
  @ApiQuery({
    name: 'publishedTo',
    required: false,
    type: String,
    description: 'Filter by published date to',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async findAll(@Request() req: AuthenticatedRequest, @Query() query: ListCommunicationsQueryDto) {
    const hasManagePermission = await this.authorizationService.hasPermission(
      req.user.userId,
      req.tenant!.institutionId,
      'communications:manage',
    );

    if (hasManagePermission) {
      return this.communicationsService.findAll(req.tenant!.institutionId, query);
    }

    return this.communicationsService.findAllVisible(
      req.tenant!.institutionId,
      query,
      req.user.userId,
    );
  }

  @Get(':id')
  @RequirePermission('communications:read')
  @ApiOperation({ summary: 'Get a communication by ID' })
  @ApiParam({ name: 'id', description: 'Communication UUID' })
  @ApiResponse({ status: 200, description: 'Communication found' })
  @ApiResponse({ status: 404, description: 'Communication not found' })
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const hasManagePermission = await this.authorizationService.hasPermission(
      req.user.userId,
      req.tenant!.institutionId,
      'communications:manage',
    );

    if (hasManagePermission) {
      return this.communicationsService.findOne(req.tenant!.institutionId, id);
    }

    return this.communicationsService.findOneVisible(
      req.tenant!.institutionId,
      id,
      req.user.userId,
    );
  }

  @Patch(':id')
  @RequirePermission('communications:manage')
  @ApiOperation({ summary: 'Update a communication' })
  @ApiParam({ name: 'id', description: 'Communication UUID' })
  @ApiResponse({ status: 200, description: 'Communication updated successfully' })
  @ApiResponse({ status: 404, description: 'Communication not found' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommunicationDto,
  ) {
    return this.communicationsService.update(
      req.tenant!.institutionId,
      id,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/publish')
  @RequirePermission('communications:manage')
  @ApiOperation({ summary: 'Publish a communication' })
  @ApiParam({ name: 'id', description: 'Communication UUID' })
  @ApiResponse({ status: 200, description: 'Communication published successfully' })
  @ApiResponse({ status: 404, description: 'Communication not found' })
  async publish(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.communicationsService.publish(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/deactivate')
  @RequirePermission('communications:manage')
  @ApiOperation({ summary: 'Deactivate a communication' })
  @ApiParam({ name: 'id', description: 'Communication UUID' })
  @ApiResponse({ status: 200, description: 'Communication deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Communication not found' })
  async deactivate(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.communicationsService.deactivate(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Post(':id/attachments')
  @RequirePermission('communications:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a communication attachment' })
  @ApiParam({ name: 'id', description: 'Communication UUID' })
  @ApiResponse({ status: 201, description: 'Attachment created successfully' })
  @ApiResponse({ status: 404, description: 'Communication not found' })
  async createAttachment(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommunicationAttachmentDto,
  ) {
    return this.filesService.createCommunicationAttachment(
      req.tenant!.institutionId,
      id,
      dto.fileAssetId,
      req.user.userId,
      req.ip,
    );
  }

  @Get(':id/attachments')
  @RequirePermission('communications:read')
  @ApiOperation({ summary: 'List attachments for a communication' })
  @ApiParam({ name: 'id', description: 'Communication UUID' })
  @ApiResponse({ status: 200, description: 'Attachments retrieved successfully' })
  async listAttachments(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.listCommunicationAttachments(req.tenant!.institutionId, id);
  }

  @Delete(':id/attachments/:attachmentId')
  @RequirePermission('communications:manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a communication attachment' })
  @ApiParam({ name: 'id', description: 'Communication UUID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment UUID' })
  @ApiResponse({ status: 200, description: 'Attachment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Communication or attachment not found' })
  async deleteAttachment(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.filesService.deleteCommunicationAttachment(
      req.tenant!.institutionId,
      id,
      attachmentId,
      req.user.userId,
      req.ip,
    );
  }
}
