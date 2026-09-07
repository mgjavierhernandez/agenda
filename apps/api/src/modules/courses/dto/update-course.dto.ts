import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseStatus, EducationLevel } from '@prisma/client';

export class UpdateCourseDto {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: EducationLevel })
  @IsOptional()
  @IsEnum(EducationLevel)
  level?: EducationLevel;

  @ApiPropertyOptional({ format: 'uuid', description: 'School grade this course belongs to' })
  @IsOptional()
  @IsUUID()
  schoolGradeId?: string;

  @ApiPropertyOptional({ maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  section?: string;

  @ApiPropertyOptional({ enum: CourseStatus })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}
