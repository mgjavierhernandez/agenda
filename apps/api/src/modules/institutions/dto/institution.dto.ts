import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  Matches,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstitutionStatus } from '@prisma/client';

export class CreateInstitutionDto {
  @ApiProperty({ description: 'Institution name', example: 'Acme University', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'URL-friendly slug', example: 'acme-university', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
  slug!: string;
}

export class UpdateInstitutionDto {
  @ApiPropertyOptional({
    description: 'Institution name',
    example: 'Acme University',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug',
    example: 'acme-university',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Institution status',
    enum: InstitutionStatus,
    example: InstitutionStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(InstitutionStatus)
  status?: InstitutionStatus;
}

export class ListInstitutionsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search term', example: 'acme' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: InstitutionStatus,
    example: InstitutionStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(InstitutionStatus)
  status?: InstitutionStatus;
}
