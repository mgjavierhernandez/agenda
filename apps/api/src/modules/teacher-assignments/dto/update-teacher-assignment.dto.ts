import { IsOptional, IsEnum, IsInt, Min, Max, IsDateString } from 'class-validator';
import { TeacherAssignmentStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTeacherAssignmentDto {
  @ApiPropertyOptional({ enum: TeacherAssignmentStatus })
  @IsOptional()
  @IsEnum(TeacherAssignmentStatus)
  status?: TeacherAssignmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
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
