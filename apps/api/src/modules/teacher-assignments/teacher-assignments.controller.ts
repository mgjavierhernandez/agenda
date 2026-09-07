import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { TeacherAssignmentsService } from './teacher-assignments.service';
import { CreateTeacherAssignmentDto } from './dto/create-teacher-assignment.dto';
import { UpdateTeacherAssignmentDto } from './dto/update-teacher-assignment.dto';
import { ListTeacherAssignmentsQueryDto } from './dto/list-teacher-assignments-query.dto';
import { CreateCourseDirectorAssignmentDto } from './dto/create-course-director-assignment.dto';
import { UpdateCourseDirectorAssignmentDto } from './dto/update-course-director-assignment.dto';
import { ListCourseDirectorAssignmentsQueryDto } from './dto/list-course-director-assignments-query.dto';

@ApiTags('Teacher Assignments')
@ApiBearerAuth('bearer')
@Controller('teacher-assignments')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class TeacherAssignmentsController {
  constructor(private readonly teacherAssignmentsService: TeacherAssignmentsService) {}

  @Post()
  @RequirePermission('teacher-assignments:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new teacher assignment' })
  @ApiResponse({ status: 201, description: 'Teacher assignment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Conflict' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateTeacherAssignmentDto) {
    return this.teacherAssignmentsService.create(req.tenant!.institutionId, dto, req.user.userId, req.ip);
  }

  @Get()
  @RequirePermission('teacher-assignments:read')
  @ApiOperation({ summary: 'List all teacher assignments' })
  @ApiResponse({ status: 200, description: 'Teacher assignments retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findAll(@Request() req: AuthenticatedRequest, @Query() query: ListTeacherAssignmentsQueryDto) {
    return this.teacherAssignmentsService.findAll(req.tenant!.institutionId, query);
  }

  @Get('teachers')
  @RequirePermission('teacher-assignments:read')
  @ApiOperation({ summary: 'List all teachers with their course/subject/student relations' })
  @ApiResponse({ status: 200, description: 'Teachers retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async teachers(@Request() req: AuthenticatedRequest) {
    return this.teacherAssignmentsService.getTeachers(req.tenant!.institutionId);
  }

  @Get('directories')
  @RequirePermission('teacher-assignments:read')
  @ApiOperation({ summary: 'List group directors (DIRECTOR_DE_GRUPO role holders)' })
  @ApiResponse({ status: 200, description: 'Directors retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async directories(@Request() req: AuthenticatedRequest) {
    return this.teacherAssignmentsService.getDirectors(req.tenant!.institutionId);
  }

  // ============ Course Director Assignment endpoints ============
  // NOTA: las rutas especificas 'course-directors*' deben declararse ANTES que
  // las genericas ':id' para que Express/Nest no capture 'course-directors'
  // como :id='course-directors' (ParseUUIDPipe => 'Validation failed (uuid is expected)').

  @Post('course-directors')
  @RequirePermission('teacher-assignments:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new course director assignment' })
  @ApiResponse({ status: 201, description: 'Course director assignment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Conflict' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async createCourseDirector(@Request() req: AuthenticatedRequest, @Body() dto: CreateCourseDirectorAssignmentDto) {
    return this.teacherAssignmentsService.createCourseDirector(req.tenant!.institutionId, dto, req.user.userId, req.ip);
  }

  @Get('course-directors')
  @RequirePermission('teacher-assignments:read')
  @ApiOperation({ summary: 'List all course director assignments' })
  @ApiResponse({ status: 200, description: 'Course director assignments retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findAllCourseDirectors(@Request() req: AuthenticatedRequest, @Query() query: ListCourseDirectorAssignmentsQueryDto) {
    return this.teacherAssignmentsService.findAllCourseDirectors(req.tenant!.institutionId, query);
  }

  @Get('course-directors/current')
  @RequirePermission('teacher-assignments:read')
  @ApiOperation({ summary: 'Get current director for a course and period' })
  @ApiResponse({ status: 200, description: 'Current director retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'No current director found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getCurrentDirector(@Request() req: AuthenticatedRequest, @Query('courseId') courseId: string, @Query('academicPeriodId') academicPeriodId: string) {
    return this.teacherAssignmentsService.getCurrentDirector(req.tenant!.institutionId, courseId, academicPeriodId);
  }

  @Get('course-directors/history')
  @RequirePermission('teacher-assignments:read')
  @ApiOperation({ summary: 'Get director history for a course and period' })
  @ApiResponse({ status: 200, description: 'Director history retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getDirectorHistory(@Request() req: AuthenticatedRequest, @Query('courseId') courseId: string, @Query('academicPeriodId') academicPeriodId: string) {
    return this.teacherAssignmentsService.getDirectorHistory(req.tenant!.institutionId, courseId, academicPeriodId);
  }

  @Get('course-directors/:id')
  @RequirePermission('teacher-assignments:read')
  @ApiOperation({ summary: 'Get a course director assignment by ID' })
  @ApiParam({ name: 'id', description: 'Course Director Assignment ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Course director assignment retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Course director assignment not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findOneCourseDirector(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacherAssignmentsService.findOneCourseDirector(req.tenant!.institutionId, id);
  }

  @Patch('course-directors/:id')
  @RequirePermission('teacher-assignments:manage')
  @ApiOperation({ summary: 'Update a course director assignment' })
  @ApiParam({ name: 'id', description: 'Course Director Assignment ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Course director assignment updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Course director assignment not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async updateCourseDirector(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCourseDirectorAssignmentDto) {
    return this.teacherAssignmentsService.updateCourseDirector(req.tenant!.institutionId, id, dto, req.user.userId, req.ip);
  }

  @Patch('course-directors/:id/deactivate')
  @RequirePermission('teacher-assignments:manage')
  @ApiOperation({ summary: 'Deactivate a course director assignment' })
  @ApiParam({ name: 'id', description: 'Course Director Assignment ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Course director assignment deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Course director assignment not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async deactivateCourseDirector(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacherAssignmentsService.deactivateCourseDirector(req.tenant!.institutionId, id, req.user.userId, req.ip);
  }

  // ============ Rutas genericas ':id' AL FINAL ============
  // Deben ir despues de todas las rutas especificas para no sombrearlas.

  @Get(':id')
  @RequirePermission('teacher-assignments:read')
  @ApiOperation({ summary: 'Get a teacher assignment by ID' })
  @ApiParam({ name: 'id', description: 'Teacher Assignment ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Teacher assignment retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Teacher assignment not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacherAssignmentsService.findOne(req.tenant!.institutionId, id);
  }

  @Patch(':id')
  @RequirePermission('teacher-assignments:manage')
  @ApiOperation({ summary: 'Update a teacher assignment' })
  @ApiParam({ name: 'id', description: 'Teacher Assignment ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Teacher assignment updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Teacher assignment not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async update(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTeacherAssignmentDto) {
    return this.teacherAssignmentsService.update(req.tenant!.institutionId, id, dto, req.user.userId, req.ip);
  }

  @Patch(':id/deactivate')
  @RequirePermission('teacher-assignments:manage')
  @ApiOperation({ summary: 'Deactivate a teacher assignment' })
  @ApiParam({ name: 'id', description: 'Teacher Assignment ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Teacher assignment deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Teacher assignment not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async deactivate(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.teacherAssignmentsService.deactivate(req.tenant!.institutionId, id, req.user.userId, req.ip);
  }
}
