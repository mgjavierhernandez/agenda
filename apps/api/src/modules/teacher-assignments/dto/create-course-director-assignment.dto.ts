import { IsNotEmpty, IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseDirectorStatus } from '@prisma/client';

export class CreateCourseDirectorAssignmentDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  directorUserId!: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  academicPeriodId!: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: CourseDirectorStatus })
  @IsOptional()
  @IsEnum(CourseDirectorStatus)
  status?: CourseDirectorStatus;
}