import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { FilesService } from './files.service';

@ApiTags('Files')
@ApiBearerAuth('bearer')
@Controller('files')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @RequirePermission('files:upload')
  @UseInterceptors(FileInterceptor('file', { storage: undefined, limits: { fileSize: 10 * 1024 * 1024 } }))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'File to upload (max 10MB)' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async upload(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.filesService.uploadFile(
      req.tenant!.institutionId,
      req.user.userId,
      file,
      req.ip,
    );
  }

  @Get(':id')
  @RequirePermission('files:read')
  @ApiOperation({ summary: 'Get file metadata by ID' })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiResponse({ status: 200, description: 'File metadata retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.findOne(req.tenant!.institutionId, id);
  }

  @Get(':id/download')
  @RequirePermission('files:read')
  @ApiOperation({ summary: 'Download a file' })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async download(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { stream, fileAsset } = await this.filesService.getDownloadStream(
      req.tenant!.institutionId,
      id,
    );
    res.set({
      'Content-Type': fileAsset.mimeType,
      'Content-Disposition': `attachment; filename="${fileAsset.originalName}"`,
      'Content-Length': String(fileAsset.sizeBytes),
      'X-Checksum': fileAsset.checksum,
    });
    stream.pipe(res);
  }

  @Delete(':id')
  @RequirePermission('files:manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async delete(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.filesService.deleteFile(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
    return { message: 'File deleted successfully' };
  }
}
