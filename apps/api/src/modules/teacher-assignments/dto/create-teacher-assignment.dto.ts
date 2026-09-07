import { IsNotEmpty, IsOptional, IsInt, Min, Max, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeacherAssignmentDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  teacherUserId!: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  subjectId!: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  academicPeriodId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  weeklyHours?: number;

  @ApiPropertyOptional({ default: 22 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  maxWeeklyHours?: number;
}
