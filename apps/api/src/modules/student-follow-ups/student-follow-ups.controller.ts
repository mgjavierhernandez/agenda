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
import { StudentFollowUpsService } from './student-follow-ups.service';
import { FollowUpCategoriesService } from './follow-up-categories.service';
import { CreateStudentFollowUpDto } from './dto/create-student-follow-up.dto';
import { UpdateStudentFollowUpDto } from './dto/update-student-follow-up.dto';
import { ListStudentFollowUpsQueryDto } from './dto/list-student-follow-ups-query.dto';
import { CreateFollowUpEntryDto } from './dto/create-follow-up-entry.dto';
import { UpdateFollowUpEntryDto } from './dto/update-follow-up-entry.dto';
import { CreateCommitmentDto } from './dto/create-commitment.dto';
import { UpdateCommitmentDto } from './dto/update-commitment.dto';
import { CreateFollowUpAttachmentDto } from './dto/create-follow-up-attachment.dto';
import { CreateFollowUpCategoryDto } from './dto/create-follow-up-category.dto';
import { UpdateFollowUpCategoryDto } from './dto/update-follow-up-category.dto';
import { FollowUpCitationsService } from './follow-up-citations.service';
import { CreateFollowUpCitationDto } from './dto/create-follow-up-citation.dto';
import { UpdateFollowUpCitationDto } from './dto/update-follow-up-citation.dto';
import { ListFollowUpCitationsQueryDto } from './dto/list-follow-up-citations-query.dto';
import { StudentFollowUpSignatureService } from './student-follow-up-signature.service';
import { RequestFollowUpSignatureDto } from './dto/request-follow-up-signature.dto';

@ApiTags('Student Follow-Ups')
@ApiBearerAuth('bearer')
@Controller('student-follow-ups')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class StudentFollowUpsController {
  constructor(
    private readonly service: StudentFollowUpsService,
    private readonly categoriesService: FollowUpCategoriesService,
    private readonly citationsService: FollowUpCitationsService,
    private readonly signatureService: StudentFollowUpSignatureService,
  ) {}

  // ============================================================
  // CATEGORIES (must be before :id routes to avoid param collision)
  // ============================================================

  @Post('categories')
  @RequirePermission('student-follow-ups:categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a follow-up category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  async createCategory(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateFollowUpCategoryDto,
  ) {
    return this.categoriesService.create(
      req.tenant!.institutionId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Get('categories')
  @RequirePermission('student-follow-ups:categories')
  @ApiOperation({ summary: 'List follow-up categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async findCategories(
    @Request() req: AuthenticatedRequest,
  ) {
    return this.categoriesService.findAll(
      req.tenant!.institutionId,
    );
  }

  @Get('categories/:id')
  @RequirePermission('student-follow-ups:categories')
  @ApiOperation({ summary: 'Get a follow-up category by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOneCategory(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categoriesService.findOne(
      req.tenant!.institutionId,
      id,
    );
  }

  @Patch('categories/:id')
  @RequirePermission('student-follow-ups:categories')
  @ApiOperation({ summary: 'Update a follow-up category' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  async updateCategory(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFollowUpCategoryDto,
  ) {
    return this.categoriesService.update(
      req.tenant!.institutionId,
      id,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Delete('categories/:id')
  @RequirePermission('student-follow-ups:categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a follow-up category' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 400, description: 'Category is in use' })
  async removeCategory(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categoriesService.remove(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  // ============================================================
  // FOLLOW-UP CRUD
  // ============================================================

  @Post()
  @RequirePermission('student-follow-ups:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new student follow-up record' })
  @ApiResponse({ status: 201, description: 'Follow-up created successfully' })
  @ApiResponse({ status: 404, description: 'Student or category not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateStudentFollowUpDto,
  ) {
    return this.service.create(
      req.tenant!.institutionId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Get()
  @RequirePermission('student-follow-ups:read')
  @ApiOperation({ summary: 'List student follow-up records' })
  @ApiResponse({ status: 200, description: 'Paginated list of follow-ups' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['ACADEMICO', 'CONVIVENCIA', 'FORMATIVO'] })
  @ApiQuery({ name: 'severity', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'PENDING_FOLLOW_UP', 'RESOLVED', 'CLOSED'] })
  @ApiQuery({ name: 'confidentiality', required: false, enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SENSITIVE'] })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'createdById', required: false, type: String })
  @ApiQuery({ name: 'createdFrom', required: false, type: String })
  @ApiQuery({ name: 'createdTo', required: false, type: String })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListStudentFollowUpsQueryDto,
  ) {
    return this.service.findAll(
      req.tenant!.institutionId,
      query,
      req.user.userId,
    );
  }

  @Get(':id')
  @RequirePermission('student-follow-ups:read')
  @ApiOperation({ summary: 'Get a student follow-up record by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Follow-up found' })
  @ApiResponse({ status: 404, description: 'Follow-up not found' })
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(
      req.tenant!.institutionId,
      id,
      req.user.userId,
    );
  }

  @Patch(':id')
  @RequirePermission('student-follow-ups:update')
  @ApiOperation({ summary: 'Update a student follow-up record' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Follow-up updated successfully' })
  @ApiResponse({ status: 404, description: 'Follow-up not found' })
  @ApiResponse({ status: 400, description: 'Cannot modify closed follow-up' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentFollowUpDto,
  ) {
    return this.service.update(
      req.tenant!.institutionId,
      id,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Post(':id/close')
  @RequirePermission('student-follow-ups:close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a student follow-up record' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Follow-up closed successfully' })
  @ApiResponse({ status: 404, description: 'Follow-up not found' })
  @ApiResponse({ status: 400, description: 'Follow-up already closed' })
  async close(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.close(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  // ============================================================
  // LIFECYCLE EXTENSIONS
  // ============================================================

  @Post(':id/escalate')
  @RequirePermission('student-follow-ups:escalate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Escalate a student follow-up record' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Follow-up escalated successfully' })
  @ApiResponse({ status: 404, description: 'Follow-up not found' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async escalate(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.escalate(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Post(':id/follow-up')
  @RequirePermission('student-follow-ups:follow_up')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transition follow-up to IN_PROGRESS' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Follow-up transitioned successfully' })
  @ApiResponse({ status: 404, description: 'Follow-up not found' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async followUp(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.followUp(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Post(':id/resolve')
  @RequirePermission('student-follow-ups:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a student follow-up record' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Follow-up resolved successfully' })
  @ApiResponse({ status: 404, description: 'Follow-up not found' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async resolve(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.resolve(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Post(':id/reopen')
  @RequirePermission('student-follow-ups:manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reopen a closed student follow-up record' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Follow-up reopened successfully' })
  @ApiResponse({ status: 404, description: 'Follow-up not found' })
  @ApiResponse({ status: 400, description: 'Record is not closed' })
  @ApiResponse({ status: 403, description: 'Only ADMIN can reopen' })
  async reopen(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.reopen(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  // ============================================================
  // ENTRIES
  // ============================================================

  @Post(':followUpId/entries')
  @RequirePermission('student-follow-ups:follow_up')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a follow-up entry' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Entry created successfully' })
  @ApiResponse({ status: 404, description: 'Follow-up not found' })
  @ApiResponse({ status: 400, description: 'Follow-up is closed' })
  async createEntry(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Body() dto: CreateFollowUpEntryDto,
  ) {
    return this.service.createEntry(
      req.tenant!.institutionId,
      followUpId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Get(':followUpId/entries')
  @RequirePermission('student-follow-ups:read')
  @ApiOperation({ summary: 'List entries for a follow-up' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Entries retrieved successfully' })
  async findEntries(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findEntries(
      req.tenant!.institutionId,
      followUpId,
      req.user.userId,
      page,
      limit,
    );
  }

  @Get(':followUpId/entries/:entryId')
  @RequirePermission('student-follow-ups:read')
  @ApiOperation({ summary: 'Get a follow-up entry by ID' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiParam({ name: 'entryId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Entry found' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async findEntry(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.service.findEntry(
      req.tenant!.institutionId,
      followUpId,
      entryId,
      req.user.userId,
    );
  }

  @Patch(':followUpId/entries/:entryId')
  @RequirePermission('student-follow-ups:follow_up')
  @ApiOperation({ summary: 'Update a follow-up entry' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiParam({ name: 'entryId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Entry updated successfully' })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  @ApiResponse({ status: 400, description: 'Follow-up is closed' })
  async updateEntry(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateFollowUpEntryDto,
  ) {
    return this.service.updateEntry(
      req.tenant!.institutionId,
      followUpId,
      entryId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  // ============================================================
  // COMMITMENTS
  // ============================================================

  @Post(':followUpId/commitments')
  @RequirePermission('student-follow-ups:commit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a commitment' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Commitment created successfully' })
  @ApiResponse({ status: 404, description: 'Follow-up or user not found' })
  @ApiResponse({ status: 400, description: 'Follow-up is closed' })
  async createCommitment(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Body() dto: CreateCommitmentDto,
  ) {
    return this.service.createCommitment(
      req.tenant!.institutionId,
      followUpId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Get(':followUpId/commitments')
  @RequirePermission('student-follow-ups:read')
  @ApiOperation({ summary: 'List commitments for a follow-up' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Commitments retrieved successfully' })
  async findCommitments(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findCommitments(
      req.tenant!.institutionId,
      followUpId,
      req.user.userId,
      page,
      limit,
    );
  }

  @Get(':followUpId/commitments/:commitmentId')
  @RequirePermission('student-follow-ups:read')
  @ApiOperation({ summary: 'Get a commitment by ID' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiParam({ name: 'commitmentId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Commitment found' })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  async findCommitment(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Param('commitmentId', ParseUUIDPipe) commitmentId: string,
  ) {
    return this.service.findCommitment(
      req.tenant!.institutionId,
      followUpId,
      commitmentId,
      req.user.userId,
    );
  }

  @Patch(':followUpId/commitments/:commitmentId')
  @RequirePermission('student-follow-ups:commit')
  @ApiOperation({ summary: 'Update a commitment' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiParam({ name: 'commitmentId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Commitment updated successfully' })
  @ApiResponse({ status: 404, description: 'Commitment not found' })
  @ApiResponse({ status: 400, description: 'Follow-up is closed' })
  async updateCommitment(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Param('commitmentId', ParseUUIDPipe) commitmentId: string,
    @Body() dto: UpdateCommitmentDto,
  ) {
    return this.service.updateCommitment(
      req.tenant!.institutionId,
      followUpId,
      commitmentId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  // ============================================================
  // ATTACHMENTS
  // ============================================================

  @Post(':followUpId/attachments')
  @RequirePermission('student-follow-ups:attach')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Attach a file to a follow-up' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Attachment created successfully' })
  @ApiResponse({ status: 404, description: 'Follow-up or file not found' })
  @ApiResponse({ status: 400, description: 'File already attached' })
  async createAttachment(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Body() dto: CreateFollowUpAttachmentDto,
  ) {
    return this.service.createAttachment(
      req.tenant!.institutionId,
      followUpId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Get(':followUpId/attachments')
  @RequirePermission('student-follow-ups:read')
  @ApiOperation({ summary: 'List attachments for a follow-up' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Attachments retrieved successfully' })
  async findAttachments(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
  ) {
    return this.service.findAttachments(
      req.tenant!.institutionId,
      followUpId,
      req.user.userId,
    );
  }

  @Delete(':followUpId/attachments/:attachmentId')
  @RequirePermission('student-follow-ups:attach')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an attachment from a follow-up' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiParam({ name: 'attachmentId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Attachment removed successfully' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async removeAttachment(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    return this.service.removeAttachment(
      req.tenant!.institutionId,
      followUpId,
      attachmentId,
      req.user.userId,
      req.ip,
    );
  }

  // ============================================================
  // CITATIONS
  // ============================================================
  @Post(':followUpId/citations')
  @RequirePermission('student-follow-ups:follow_up')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a citation for a follow-up' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Citation created successfully' })
  @ApiResponse({ status: 404, description: 'Follow-up not found' })
  @ApiResponse({ status: 400, description: 'Follow-up is closed or invalid date' })
  async createCitation(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Body() dto: CreateFollowUpCitationDto,
  ) {
    return this.citationsService.create(
      req.tenant!.institutionId,
      followUpId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Get(':followUpId/citations')
  @RequirePermission('student-follow-ups:read')
  @ApiOperation({ summary: 'List citations for a follow-up' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Citations retrieved successfully' })
  async findCitations(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Query() query: ListFollowUpCitationsQueryDto,
  ) {
    return this.citationsService.findAll(
      req.tenant!.institutionId,
      followUpId,
      query,
      req.user.userId,
    );
  }

  @Get(':followUpId/citations/:citationId')
  @RequirePermission('student-follow-ups:read')
  @ApiOperation({ summary: 'Get a citation by ID' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiParam({ name: 'citationId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Citation found' })
  @ApiResponse({ status: 404, description: 'Citation not found' })
  async findOneCitation(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Param('citationId', ParseUUIDPipe) citationId: string,
  ) {
    return this.citationsService.findOne(
      req.tenant!.institutionId,
      followUpId,
      citationId,
      req.user.userId,
    );
  }

  @Patch(':followUpId/citations/:citationId')
  @RequirePermission('student-follow-ups:follow_up')
  @ApiOperation({ summary: 'Update a citation' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiParam({ name: 'citationId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Citation updated successfully' })
  @ApiResponse({ status: 404, description: 'Citation not found' })
  @ApiResponse({ status: 400, description: 'Follow-up is closed' })
  async updateCitation(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Param('citationId', ParseUUIDPipe) citationId: string,
    @Body() dto: UpdateFollowUpCitationDto,
  ) {
    return this.citationsService.update(
      req.tenant!.institutionId,
      followUpId,
      citationId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Delete(':followUpId/citations/:citationId')
  @RequirePermission('student-follow-ups:follow_up')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a citation' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiParam({ name: 'citationId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Citation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Citation not found' })
  async removeCitation(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Param('citationId', ParseUUIDPipe) citationId: string,
  ) {
    return this.citationsService.remove(
      req.tenant!.institutionId,
      followUpId,
      citationId,
      req.user.userId,
      req.ip,
    );
  }

  // ============================================================
  // SIGNATURES (integration with the Signatures module)
  // ============================================================

  @Post(':followUpId/signatures')
  @RequirePermission('student-follow-ups:commit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a signature/acknowledgement from a follow-up' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Signature request created successfully' })
  @ApiResponse({ status: 404, description: 'Follow-up not found' })
  async requestSignature(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
    @Body() dto: RequestFollowUpSignatureDto,
  ) {
    return this.signatureService.requestSignature(
      req.tenant!.institutionId,
      followUpId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Get(':followUpId/signatures')
  @RequirePermission('student-follow-ups:read')
  @ApiOperation({ summary: 'List signature requests linked to a follow-up' })
  @ApiParam({ name: 'followUpId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Signature requests retrieved successfully' })
  async findSignaturesForFollowUp(
    @Request() req: AuthenticatedRequest,
    @Param('followUpId', ParseUUIDPipe) followUpId: string,
  ) {
    return this.signatureService.findByFollowUp(
      req.tenant!.institutionId,
      followUpId,
      req.user.userId,
    );
  }
}
