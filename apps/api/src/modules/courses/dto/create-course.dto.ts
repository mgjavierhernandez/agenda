import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseStatus, EducationLevel } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty({ maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: EducationLevel, description: 'Education level (defaults to PRIMARIA)' })
  @IsOptional()
  @IsEnum(EducationLevel)
  level?: EducationLevel;

  @ApiPropertyOptional({ format: 'uuid', description: 'School grade this course belongs to' })
  @IsOptional()
  @IsUUID()
  schoolGradeId?: string;

  @ApiPropertyOptional({ maxLength: 10, description: 'Section/group identifier (e.g. A, B)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  section?: string;

  @ApiPropertyOptional({ enum: CourseStatus })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}
