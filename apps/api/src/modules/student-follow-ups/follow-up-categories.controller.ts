import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
import {
  TenantContextGuard,
  AuthenticatedRequest,
} from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';
import { RequirePermission } from '../auth/authorization/require-permission.decorator';
import { FollowUpCategoriesService } from './follow-up-categories.service';
import { CreateFollowUpCategoryDto } from './dto/create-follow-up-category.dto';
import { UpdateFollowUpCategoryDto } from './dto/update-follow-up-category.dto';

@ApiTags('Follow-Up Categories')
@ApiBearerAuth('bearer')
@Controller('student-follow-ups/categories')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class FollowUpCategoriesController {
  constructor(private readonly categoriesService: FollowUpCategoriesService) {}

  @Post()
  @RequirePermission('student-follow-ups:categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a follow-up category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateFollowUpCategoryDto,
  ) {
    return this.categoriesService.create(
      req.tenant!.institutionId,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Get()
  @RequirePermission('student-follow-ups:categories')
  @ApiOperation({ summary: 'List follow-up categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async findAll(
    @Request() req: AuthenticatedRequest,
  ) {
    return this.categoriesService.findAll(
      req.tenant!.institutionId,
    );
  }

  @Get(':id')
  @RequirePermission('student-follow-ups:categories')
  @ApiOperation({ summary: 'Get a follow-up category by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categoriesService.findOne(
      req.tenant!.institutionId,
      id,
    );
  }

  @Patch(':id')
  @RequirePermission('student-follow-ups:categories')
  @ApiOperation({ summary: 'Update a follow-up category' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFollowUpCategoryDto,
  ) {
    return this.categoriesService.update(
      req.tenant!.institutionId,
      id,
      dto,
      req.user.userId,
      req.ip,
    );
  }

  @Delete(':id')
  @RequirePermission('student-follow-ups:categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a follow-up category' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 400, description: 'Category is in use' })
  async remove(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categoriesService.remove(
      req.tenant!.institutionId,
      id,
      req.user.userId,
      req.ip,
    );
  }
}
