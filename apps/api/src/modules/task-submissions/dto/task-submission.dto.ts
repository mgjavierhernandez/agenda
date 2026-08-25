import { IsString, IsOptional, IsEnum, IsDecimal, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubmissionDto {
  @ApiPropertyOptional({ description: 'Submission content', example: 'Assignment submission text', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;
}

export class UpdateSubmissionDto {
  @ApiPropertyOptional({ description: 'Updated submission content', example: 'Updated assignment text', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;
}

export class GradeSubmissionDto {
  @ApiProperty({ description: 'Grade score (0-100)', example: 95.5 })
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  grade!: string;

  @ApiPropertyOptional({ description: 'Grading feedback', example: 'Great work on this assignment', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}

export enum SubmissionStatusFilter {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  LATE = 'LATE',
  GRADED = 'GRADED',
  RETURNED = 'RETURNED',
}

export class ListSubmissionsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: SubmissionStatusFilter, example: SubmissionStatusFilter.SUBMITTED })
  @IsOptional()
  @IsEnum(SubmissionStatusFilter)
  status?: SubmissionStatusFilter;

  @ApiPropertyOptional({ description: 'Filter by student ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 20 })
  @IsOptional()
  limit?: number;
}
