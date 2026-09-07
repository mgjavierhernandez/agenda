import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { CourseDirectorStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCourseDirectorAssignmentDto {
  @ApiPropertyOptional({ enum: CourseDirectorStatus })
  @IsOptional()
  @IsEnum(CourseDirectorStatus)
  status?: CourseDirectorStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}