import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { ReportsService, ReportFileResult } from './reports.service';
import { ReportsQueryDto, ReportsExportQueryDto } from './dto/reports-query.dto';
import { StudentReportDto, StudentBulletinDto, CourseReportDto } from './dto/reports-response.dto';

@ApiTags('Reports')
@ApiBearerAuth('bearer')
@Controller('reports')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('students/:studentId')
  @RequirePermission('reports:read')
  @ApiOperation({ summary: 'Get an individual academic report for a student' })
  @ApiParam({ name: 'studentId', description: 'Student ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: StudentReportDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  getStudentReport(
    @Request() req: AuthenticatedRequest,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() query: ReportsQueryDto,
  ): Promise<StudentReportDto> {
    return this.reportsService.getStudentReport(
      req.user.userId,
      req.tenant!.institutionId,
      studentId,
      query.academicPeriodId ?? null,
    );
  }

  @Get('students/:studentId/bulletin')
  @RequirePermission('reports:read')
  @ApiOperation({ summary: 'Get the academic bulletin for a student' })
  @ApiParam({ name: 'studentId', description: 'Student ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: StudentBulletinDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  getStudentBulletin(
    @Request() req: AuthenticatedRequest,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() query: ReportsQueryDto,
  ): Promise<StudentBulletinDto> {
    return this.reportsService.getStudentBulletin(
      req.user.userId,
      req.tenant!.institutionId,
      studentId,
      query.academicPeriodId ?? null,
    );
  }

  @Get('students/:studentId/export')
  @RequirePermission('reports:export')
  @ApiOperation({ summary: 'Export an individual academic report (PDF or CSV)' })
  @ApiParam({ name: 'studentId', description: 'Student ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'File download' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async exportStudentReport(
    @Request() req: AuthenticatedRequest,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() query: ReportsExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.reportsService.exportStudentReport(
      req.user.userId,
      req.tenant!.institutionId,
      studentId,
      query.academicPeriodId ?? null,
      query.format ?? 'pdf',
      req.ip,
    );
    this.sendFile(res, result);
  }

  @Get('students/:studentId/bulletin/export')
  @RequirePermission('reports:export')
  @ApiOperation({ summary: 'Export the academic bulletin (PDF or CSV)' })
  @ApiParam({ name: 'studentId', description: 'Student ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'File download' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async exportStudentBulletin(
    @Request() req: AuthenticatedRequest,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() query: ReportsExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.reportsService.exportStudentBulletin(
      req.user.userId,
      req.tenant!.institutionId,
      studentId,
      query.academicPeriodId ?? null,
      query.format ?? 'pdf',
      req.ip,
    );
    this.sendFile(res, result);
  }

  @Get('courses/:courseId')
  @RequirePermission('reports:read')
  @ApiOperation({ summary: 'Get a course report with per-student consolidation' })
  @ApiParam({ name: 'courseId', description: 'Course ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: CourseReportDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  getCourseReport(
    @Request() req: AuthenticatedRequest,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() query: ReportsQueryDto,
  ): Promise<CourseReportDto> {
    return this.reportsService.getCourseReport(
      req.user.userId,
      req.tenant!.institutionId,
      courseId,
      query.academicPeriodId ?? null,
    );
  }

  @Get('courses/:courseId/export')
  @RequirePermission('reports:export')
  @ApiOperation({ summary: 'Export a course report as CSV' })
  @ApiParam({ name: 'courseId', description: 'Course ID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'CSV download' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async exportCourseReport(
    @Request() req: AuthenticatedRequest,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() query: ReportsQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.reportsService.exportCourseReportCsv(
      req.user.userId,
      req.tenant!.institutionId,
      courseId,
      query.academicPeriodId ?? null,
      req.ip,
    );
    this.sendFile(res, result);
  }

  private sendFile(res: Response, result: ReportFileResult): void {
    const safeFilename = result.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(result.buffer);
  }
}
