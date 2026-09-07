import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { StudentsService } from './students.service';
import { StudentsImportService } from './students-import.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { ImportStudentsOptionsDto } from './dto/import-students.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Students')
@ApiBearerAuth('bearer')
@Controller('students')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly studentsImportService: StudentsImportService,
  ) {}

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
      req.user.userId,
    );
  }

  @ApiOperation({ summary: 'Bulk import students from CSV or XLSX (max 5MB)' })
  @ApiResponse({ status: 201, description: 'Import summary with per-row errors' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'CSV or XLSX file (max 5MB)' },
        courseId: { type: 'string', format: 'uuid', description: 'Default course for rows without courseCode' },
        academicPeriodId: { type: 'string', format: 'uuid', description: 'Academic period for enrollments' },
      },
      required: ['file'],
    },
  })
  @Post('import')
  @RequirePermission('students:manage')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async import(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() options: ImportStudentsOptionsDto,
  ) {
    return this.studentsImportService.importFromFile(
      req.tenant!.institutionId,
      file,
      options,
      req.user.userId,
      req.ip,
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
      req.user.userId,
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
