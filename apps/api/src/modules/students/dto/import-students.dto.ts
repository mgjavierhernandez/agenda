import { IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ImportStudentsOptionsDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Default course applied to rows without courseCode' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Academic period for enrollments (defaults to the single ACTIVE period)' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  academicPeriodId?: string;
}

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportStudentsResult {
  created: number;
  updated: number;
  enrollments: number;
  errors: ImportRowError[];
}
