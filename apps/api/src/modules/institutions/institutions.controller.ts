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
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { OptionalTenantContextGuard, AuthenticatedRequest } from '../auth/tenant/optional-tenant.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto, UpdateInstitutionDto, ListInstitutionsQueryDto } from './dto/institution.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Institutions')
@ApiBearerAuth('bearer')
@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @ApiOperation({ summary: 'Create a new institution' })
  @ApiResponse({ status: 201, description: 'Institution created' })
  @ApiResponse({ status: 409, description: 'Institution slug already exists' })
  @Post()
  @UseGuards(AccessTokenGuard, PermissionGuard)
  @RequirePermission('institution:manage')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateInstitutionDto,
  ) {
    return this.institutionsService.create(dto, req.user.userId, req.ip);
  }

  @ApiOperation({ summary: 'List institutions' })
  @ApiResponse({ status: 200, description: 'Paginated list of institutions' })
  @Get()
  @UseGuards(AccessTokenGuard, PermissionGuard)
  @RequirePermission('institution:read')
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListInstitutionsQueryDto,
  ) {
    return this.institutionsService.findAll(query);
  }

  @ApiOperation({ summary: 'Get institution by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Institution found' })
  @ApiResponse({ status: 404, description: 'Institution not found' })
  @Get(':id')
  @UseGuards(AccessTokenGuard, OptionalTenantContextGuard, PermissionGuard)
  @RequirePermission('institution:read')
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.institutionsService.findOne(id, req.tenant?.institutionId);
  }

  @ApiOperation({ summary: 'Update institution' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Institution updated' })
  @ApiResponse({ status: 404, description: 'Institution not found' })
  @Patch(':id')
  @UseGuards(AccessTokenGuard, OptionalTenantContextGuard, PermissionGuard)
  @RequirePermission('institution:manage')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstitutionDto,
  ) {
    return this.institutionsService.update(id, dto, req.user.userId, req.tenant?.institutionId, req.ip);
  }

  @ApiOperation({ summary: 'Deactivate institution' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Institution deactivated' })
  @ApiResponse({ status: 404, description: 'Institution not found' })
  @Patch(':id/deactivate')
  @UseGuards(AccessTokenGuard, OptionalTenantContextGuard, PermissionGuard)
  @RequirePermission('institution:manage')
  async deactivate(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.institutionsService.deactivate(id, req.user.userId, req.tenant?.institutionId, req.ip);
  }
}
