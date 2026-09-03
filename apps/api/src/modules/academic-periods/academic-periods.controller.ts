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
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { AcademicPeriodsService } from './academic-periods.service';
import { CreateAcademicPeriodDto } from './dto/create-academic-period.dto';
import { UpdateAcademicPeriodDto } from './dto/update-academic-period.dto';
import { ListAcademicPeriodsQueryDto } from './dto/list-academic-periods-query.dto';

@ApiTags('Academic Periods')
@ApiBearerAuth('bearer')
@Controller('academic-periods')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class AcademicPeriodsController {
  constructor(private readonly academicPeriodsService: AcademicPeriodsService) {}

  @Post()
  @RequirePermission('academic-periods:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new academic period' })
  @ApiResponse({ status: 201, description: 'Academic period created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Conflict' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() createAcademicPeriodDto: CreateAcademicPeriodDto,
  ) {
    return this.academicPeriodsService.create(
      req.tenant!.institutionId,
      createAcademicPeriodDto,
      req.user.userId,
      req.ip,
    );
  }

  @Get()
  @RequirePermission('academic-periods:read')
  @ApiOperation({ summary: 'List all academic periods' })
  @ApiResponse({ status: 200, description: 'Academic periods retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListAcademicPeriodsQueryDto,
  ) {
    return this.academicPeriodsService.findAll(
      req.tenant!.institutionId,
      query,
    );
  }

  @Get(':id')
  @RequirePermission('academic-periods:read')
  @ApiOperation({ summary: 'Get an academic period by ID' })
  @ApiParam({ name: 'id', description: 'Academic Period ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Academic period retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Academic period not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.academicPeriodsService.findOne(
      req.tenant!.institutionId,
      id,
    );
  }

  @Patch(':id')
  @RequirePermission('academic-periods:manage')
  @ApiOperation({ summary: 'Update an academic period' })
  @ApiParam({ name: 'id', description: 'Academic Period ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Academic period updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Academic period not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAcademicPeriodDto: UpdateAcademicPeriodDto,
  ) {
    return this.academicPeriodsService.update(
      req.tenant!.institutionId,
      id,
      updateAcademicPeriodDto,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/deactivate')
  @RequirePermission('academic-periods:manage')
  @ApiOperation({ summary: 'Deactivate an academic period' })
  @ApiParam({ name: 'id', description: 'Academic Period ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Academic period deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Academic period not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async deactivate(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.academicPeriodsService.deactivate(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/close')
  @RequirePermission('academic-periods:close')
  @ApiOperation({ summary: 'Close an academic period' })
  @ApiParam({ name: 'id', description: 'Academic Period ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Academic period closed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Academic period not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async close(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.academicPeriodsService.close(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }
}
