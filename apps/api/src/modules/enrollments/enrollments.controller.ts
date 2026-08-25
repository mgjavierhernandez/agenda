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
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { ListEnrollmentsQueryDto } from './dto/list-enrollments-query.dto';

@ApiTags('Enrollments')
@ApiBearerAuth('bearer')
@Controller('enrollments')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @RequirePermission('enrollments:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new enrollment' })
  @ApiResponse({ status: 201, description: 'Enrollment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Conflict' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() createEnrollmentDto: CreateEnrollmentDto,
  ) {
    return this.enrollmentsService.create(
      req.tenant!.institutionId,
      createEnrollmentDto,
      req.user.userId,
      req.ip,
    );
  }

  @Get()
  @RequirePermission('enrollments:read')
  @ApiOperation({ summary: 'List all enrollments' })
  @ApiResponse({ status: 200, description: 'Enrollments retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListEnrollmentsQueryDto,
  ) {
    return this.enrollmentsService.findAll(
      req.tenant!.institutionId,
      query,
    );
  }

  @Get(':id')
  @RequirePermission('enrollments:read')
  @ApiOperation({ summary: 'Get an enrollment by ID' })
  @ApiParam({ name: 'id', description: 'Enrollment ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Enrollment retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.enrollmentsService.findOne(
      req.tenant!.institutionId,
      id,
    );
  }

  @Patch(':id')
  @RequirePermission('enrollments:manage')
  @ApiOperation({ summary: 'Update an enrollment' })
  @ApiParam({ name: 'id', description: 'Enrollment ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Enrollment updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
  ) {
    return this.enrollmentsService.update(
      req.tenant!.institutionId,
      id,
      updateEnrollmentDto,
      req.user.userId,
      req.ip,
    );
  }

  @Patch(':id/deactivate')
  @RequirePermission('enrollments:manage')
  @ApiOperation({ summary: 'Deactivate an enrollment' })
  @ApiParam({ name: 'id', description: 'Enrollment ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Enrollment deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async deactivate(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.enrollmentsService.deactivate(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }
}
