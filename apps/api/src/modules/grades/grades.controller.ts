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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { ListGradesQueryDto } from './dto/list-grades-query.dto';

@ApiTags('Grades')
@ApiBearerAuth('bearer')
@Controller('grades')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post()
  @RequirePermission('grades:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new grade' })
  @ApiResponse({ status: 201, description: 'Grade created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Conflict' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async create(@Request() req: AuthenticatedRequest, @Body() createGradeDto: CreateGradeDto) {
    return this.gradesService.create(
      req.tenant!.institutionId,
      createGradeDto,
      req.user.userId,
      req.ip,
    );
  }

  @Get()
  @RequirePermission('grades:read')
  @ApiOperation({ summary: 'List all grades' })
  @ApiResponse({ status: 200, description: 'Grades retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findAll(@Request() req: AuthenticatedRequest, @Query() query: ListGradesQueryDto) {
    return this.gradesService.findAll(req.tenant!.institutionId, query, req.user.userId);
  }

  @Get(':id')
  @RequirePermission('grades:read')
  @ApiOperation({ summary: 'Get a grade by ID' })
  @ApiParam({ name: 'id', description: 'Grade ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Grade retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Grade not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.gradesService.findOne(req.tenant!.institutionId, id, req.user.userId);
  }

  @Patch(':id')
  @RequirePermission('grades:manage')
  @ApiOperation({ summary: 'Update a grade' })
  @ApiParam({ name: 'id', description: 'Grade ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Grade updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Grade not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGradeDto: UpdateGradeDto,
  ) {
    return this.gradesService.update(
      req.tenant!.institutionId,
      id,
      updateGradeDto,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/deactivate')
  @RequirePermission('grades:manage')
  @ApiOperation({ summary: 'Deactivate a grade' })
  @ApiParam({ name: 'id', description: 'Grade ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Grade deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Grade not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async deactivate(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.gradesService.deactivate(req.tenant!.institutionId, id, req.user.userId, req.ip);
  }
}
