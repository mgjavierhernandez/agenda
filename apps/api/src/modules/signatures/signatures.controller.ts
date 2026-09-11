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
import { SignaturesService } from './signatures.service';
import { CreateSignatureRequestDto } from './dto/create-signature-request.dto';
import { UpdateSignatureRequestDto } from './dto/update-signature-request.dto';
import { ListSignatureRequestsQueryDto } from './dto/list-signature-requests-query.dto';

@ApiTags('Signatures')
@ApiBearerAuth('bearer')
@Controller('signature-requests')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class SignaturesController {
  constructor(
    private readonly signaturesService: SignaturesService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  private async isManager(userId: string, institutionId: string): Promise<boolean> {
    return this.authorizationService.hasAnyPermission(userId, institutionId, [
      'signatures:request',
    ]);
  }

  @Post()
  @RequirePermission('signatures:request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new signature request' })
  @ApiResponse({ status: 201, description: 'Signature request created successfully' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateSignatureRequestDto,
  ) {
    return this.signaturesService.create(
      req.tenant!.institutionId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Get()
  @RequirePermission('signatures:read')
  @ApiOperation({ summary: 'List signature requests with optional filters' })
  @ApiResponse({ status: 200, description: 'Signature requests retrieved successfully' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by title or description' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiQuery({ name: 'dueDateFrom', required: false, type: String, description: 'Filter by due date from' })
  @ApiQuery({ name: 'dueDateTo', required: false, type: String, description: 'Filter by due date to' })
  @ApiQuery({ name: 'recipientUserId', required: false, type: String, description: 'Filter by recipient user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListSignatureRequestsQueryDto,
  ) {
    const manager = await this.isManager(req.user.userId, req.tenant!.institutionId);
    return this.signaturesService.findAll(
      req.tenant!.institutionId,
      query,
      req.user.userId,
      manager,
    );
  }

  @Get(':id')
  @RequirePermission('signatures:read')
  @ApiOperation({ summary: 'Get a signature request by ID' })
  @ApiParam({ name: 'id', description: 'Signature request UUID' })
  @ApiResponse({ status: 200, description: 'Signature request found' })
  @ApiResponse({ status: 404, description: 'Signature request not found' })
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const manager = await this.isManager(req.user.userId, req.tenant!.institutionId);
    return this.signaturesService.findOne(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      manager,
      req.ip,
    );
  }

  @Patch(':id')
  @RequirePermission('signatures:request')
  @ApiOperation({ summary: 'Update a signature request' })
  @ApiParam({ name: 'id', description: 'Signature request UUID' })
  @ApiResponse({ status: 200, description: 'Signature request updated successfully' })
  @ApiResponse({ status: 404, description: 'Signature request not found' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSignatureRequestDto,
  ) {
    return this.signaturesService.update(
      req.tenant!.institutionId,
      id,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/publish')
  @RequirePermission('signatures:request')
  @ApiOperation({ summary: 'Publish a signature request' })
  @ApiParam({ name: 'id', description: 'Signature request UUID' })
  @ApiResponse({ status: 200, description: 'Signature request published successfully' })
  @ApiResponse({ status: 404, description: 'Signature request not found' })
  async publish(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.signaturesService.publish(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/sign')
  @RequirePermission('signatures:sign')
  @ApiOperation({ summary: 'Sign a signature request' })
  @ApiParam({ name: 'id', description: 'Signature request UUID' })
  @ApiResponse({ status: 200, description: 'Signature request signed successfully' })
  @ApiResponse({ status: 404, description: 'Signature request not found' })
  async sign(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.signaturesService.sign(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/decline')
  @RequirePermission('signatures:sign')
  @ApiOperation({ summary: 'Decline a signature request' })
  @ApiParam({ name: 'id', description: 'Signature request UUID' })
  @ApiResponse({ status: 200, description: 'Signature request declined successfully' })
  @ApiResponse({ status: 404, description: 'Signature request not found' })
  async decline(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.signaturesService.decline(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/deactivate')
  @RequirePermission('signatures:request')
  @ApiOperation({ summary: 'Deactivate a signature request' })
  @ApiParam({ name: 'id', description: 'Signature request UUID' })
  @ApiResponse({ status: 200, description: 'Signature request deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Signature request not found' })
  async deactivate(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.signaturesService.deactivate(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }
}
