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
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { ClassroomsService } from './classrooms.service';
import {
  CreateClassroomDto,
  UpdateClassroomDto,
  ListClassroomsQueryDto,
} from './dto/classroom.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Classrooms')
@ApiBearerAuth('bearer')
@Controller('classrooms')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @ApiOperation({ summary: 'Create a classroom (physical space)' })
  @ApiResponse({ status: 201, description: 'Classroom created' })
  @ApiResponse({ status: 409, description: 'Classroom code already exists' })
  @Post()
  @RequirePermission('schedules:manage')
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateClassroomDto) {
    return this.classroomsService.create(req.tenant!.institutionId, dto, req.user.userId, req.ip);
  }

  @ApiOperation({ summary: 'List classrooms' })
  @ApiResponse({ status: 200, description: 'Paginated list of classrooms' })
  @Get()
  @RequirePermission('schedules:read')
  async findAll(@Request() req: AuthenticatedRequest, @Query() query: ListClassroomsQueryDto) {
    return this.classroomsService.findAll(req.tenant!.institutionId, query);
  }

  @ApiOperation({ summary: 'Get classroom by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Classroom found' })
  @ApiResponse({ status: 404, description: 'Classroom not found' })
  @Get(':id')
  @RequirePermission('schedules:read')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.classroomsService.findOne(req.tenant!.institutionId, id);
  }

  @ApiOperation({ summary: 'Update classroom' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Classroom updated' })
  @ApiResponse({ status: 404, description: 'Classroom not found' })
  @Patch(':id')
  @RequirePermission('schedules:manage')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClassroomDto,
  ) {
    return this.classroomsService.update(
      req.tenant!.institutionId,
      id,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @ApiOperation({ summary: 'Deactivate classroom' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Classroom deactivated' })
  @ApiResponse({ status: 404, description: 'Classroom not found' })
  @Patch(':id/deactivate')
  @RequirePermission('schedules:manage')
  async deactivate(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.classroomsService.deactivate(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }
}
