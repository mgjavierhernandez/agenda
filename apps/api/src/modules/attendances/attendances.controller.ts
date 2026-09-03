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
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { AttendancesService } from './attendances.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { ListAttendancesQueryDto } from './dto/list-attendances-query.dto';
import { CreateAttendanceBulkDto } from './dto/create-attendance-bulk.dto';

@ApiTags('Attendance')
@ApiBearerAuth('bearer')
@Controller('attendance')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Post()
  @RequirePermission('attendance:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register attendance for a student' })
  @ApiResponse({ status: 201, description: 'Attendance recorded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request / closed period / duplicate' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Student, course or period not found' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() createAttendanceDto: CreateAttendanceDto,
  ) {
    return this.attendancesService.create(
      req.tenant!.institutionId,
      createAttendanceDto,
      req.user.userId,
      req.ip,
    );
  }

  @Post('bulk')
  @RequirePermission('attendance:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register attendance for multiple students in one operation' })
  @ApiResponse({ status: 201, description: 'Bulk attendance recorded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request / closed period' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Student or course not found' })
  async bulkCreate(
    @Request() req: AuthenticatedRequest,
    @Body() bulkAttendanceDto: CreateAttendanceBulkDto,
  ) {
    return this.attendancesService.bulkCreate(
      req.tenant!.institutionId,
      bulkAttendanceDto,
      req.user.userId,
      req.ip,
    );
  }

  @Get()
  @RequirePermission('attendance:read')
  @ApiOperation({ summary: 'List attendance records with filters' })
  @ApiResponse({ status: 200, description: 'Attendance records retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListAttendancesQueryDto,
  ) {
    return this.attendancesService.findAll(
      req.tenant!.institutionId,
      query,
      req.user.userId,
    );
  }

  @Get(':id')
  @RequirePermission('attendance:read')
  @ApiOperation({ summary: 'Get an attendance record by ID' })
  @ApiParam({ name: 'id', description: 'Attendance ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Attendance record retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.attendancesService.findOne(
      req.tenant!.institutionId,
      id,
      req.user.userId,
    );
  }

  @Patch(':id')
  @RequirePermission('attendance:update')
  @ApiOperation({ summary: 'Update an attendance record (status / notes)' })
  @ApiParam({ name: 'id', description: 'Attendance ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Attendance updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request / closed period' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return this.attendancesService.update(
      req.tenant!.institutionId,
      id,
      updateAttendanceDto,
      req.user.userId,
      req.ip,
    );
  }

  @Delete(':id')
  @RequirePermission('attendance:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an attendance record (admin only)' })
  @ApiParam({ name: 'id', description: 'Attendance ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Attendance deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request / closed period' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  async remove(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.attendancesService.remove(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }
}
