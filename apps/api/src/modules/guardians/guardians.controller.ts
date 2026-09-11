import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { GuardiansService } from './guardians.service';
import { LinkGuardianDto } from './dto/link-guardian.dto';
import { ListGuardiansQueryDto } from './dto/list-guardians-query.dto';

@ApiTags('Guardians')
@ApiBearerAuth('bearer')
@Controller('guardians')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) {}

  @Post('students/:studentId')
  @RequirePermission('guardians:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Link a student to a guardian' })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
  @ApiResponse({ status: 201, description: 'Student linked successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async linkStudent(
    @Request() req: AuthenticatedRequest,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: LinkGuardianDto,
  ) {
    return this.guardiansService.linkStudent(
      req.tenant!.institutionId,
      dto.guardianUserId ?? req.user.userId,
      { ...dto, studentId },
      req.user.userId,
      req.ip,
    );
  }

  @Get('students')
  @RequirePermission('guardians:read')
  @ApiOperation({ summary: 'Find students by guardian' })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  async findStudentsByGuardian(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListGuardiansQueryDto,
  ) {
    return this.guardiansService.findStudentsByGuardian(
      req.tenant!.institutionId,
      req.user.userId,
      query,
    );
  }

  @Get('students/:studentId/guardians')
  @RequirePermission('guardians:read')
  @ApiOperation({ summary: 'Find guardians by student' })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
  @ApiResponse({ status: 200, description: 'Guardians retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findByStudent(
    @Request() req: AuthenticatedRequest,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.guardiansService.findByStudent(
      req.tenant!.institutionId,
      studentId,
      req.user.userId,
    );
  }

  @Delete('students/:studentId')
  @RequirePermission('guardians:manage')
  @ApiOperation({ summary: 'Unlink a student from a guardian' })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
  @ApiResponse({ status: 200, description: 'Student unlinked successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async unlinkStudent(
    @Request() req: AuthenticatedRequest,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.guardiansService.unlinkStudent(
      req.tenant!.institutionId,
      req.user.userId,
      studentId,
      req.user.userId,
      req.ip,
    );
  }
}
