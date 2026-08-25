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
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Students')
@ApiBearerAuth('bearer')
@Controller('students')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @ApiOperation({ summary: 'Create a new student' })
  @ApiResponse({ status: 201, description: 'Student created' })
  @ApiResponse({ status: 409, description: 'Student document already exists' })
  @Post()
  @RequirePermission('students:manage')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() createStudentDto: CreateStudentDto,
  ) {
    return this.studentsService.create(
      req.tenant!.institutionId,
      createStudentDto,
      req.user.userId,
      req.ip,
    );
  }

  @ApiOperation({ summary: 'List students' })
  @ApiResponse({ status: 200, description: 'Paginated list of students' })
  @Get()
  @RequirePermission('students:read')
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListStudentsQueryDto,
  ) {
    return this.studentsService.findAll(
      req.tenant!.institutionId,
      query,
    );
  }

  @ApiOperation({ summary: 'Get student by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Student found' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @Get(':id')
  @RequirePermission('students:read')
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.studentsService.findOne(
      req.tenant!.institutionId,
      id,
    );
  }

  @ApiOperation({ summary: 'Update student' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Student updated' })
  @Patch(':id')
  @RequirePermission('students:manage')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(
      req.tenant!.institutionId,
      id,
      updateStudentDto,
      req.user.userId,
      req.ip,
    );
  }

  @ApiOperation({ summary: 'Deactivate student' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Student deactivated' })
  @Patch(':id/deactivate')
  @RequirePermission('students:manage')
  async deactivate(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.studentsService.deactivate(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }
}
