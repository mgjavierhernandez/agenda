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
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto, UpdateInstitutionDto, ListInstitutionsQueryDto } from './dto/institution.dto';
import { AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Institutions')
@ApiBearerAuth('bearer')
@Controller('institutions')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @ApiOperation({ summary: 'Create a new institution' })
  @ApiResponse({ status: 201, description: 'Institution created' })
  @ApiResponse({ status: 409, description: 'Institution slug already exists' })
  @Post()
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
  @RequirePermission('institution:read')
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.institutionsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update institution' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Institution updated' })
  @ApiResponse({ status: 404, description: 'Institution not found' })
  @Patch(':id')
  @RequirePermission('institution:manage')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstitutionDto,
  ) {
    return this.institutionsService.update(id, dto, req.user.userId, req.ip);
  }

  @ApiOperation({ summary: 'Deactivate institution' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Institution deactivated' })
  @ApiResponse({ status: 404, description: 'Institution not found' })
  @Patch(':id/deactivate')
  @RequirePermission('institution:manage')
  async deactivate(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.institutionsService.deactivate(id, req.user.userId, req.ip);
  }
}
