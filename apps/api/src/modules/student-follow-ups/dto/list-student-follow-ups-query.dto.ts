import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  FollowUpType,
  FollowUpSeverity,
  FollowUpStatus,
  FollowUpConfidentiality,
} from '@prisma/client';

export class ListStudentFollowUpsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by student UUID' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ enum: FollowUpType })
  @IsOptional()
  @IsEnum(FollowUpType)
  type?: FollowUpType;

  @ApiPropertyOptional({ enum: FollowUpSeverity })
  @IsOptional()
  @IsEnum(FollowUpSeverity)
  severity?: FollowUpSeverity;

  @ApiPropertyOptional({ enum: FollowUpStatus })
  @IsOptional()
  @IsEnum(FollowUpStatus)
  status?: FollowUpStatus;

  @ApiPropertyOptional({ enum: FollowUpConfidentiality })
  @IsOptional()
  @IsEnum(FollowUpConfidentiality)
  confidentiality?: FollowUpConfidentiality;

  @ApiPropertyOptional({ description: 'Filter by category UUID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by creator user UUID' })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiPropertyOptional({ description: 'Filter records created from this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'Filter records created up to this date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
