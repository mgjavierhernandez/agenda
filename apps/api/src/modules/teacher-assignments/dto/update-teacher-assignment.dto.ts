import { IsOptional, IsEnum } from 'class-validator';
import { TeacherAssignmentStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTeacherAssignmentDto {
  @ApiPropertyOptional({ enum: TeacherAssignmentStatus })
  @IsOptional()
  @IsEnum(TeacherAssignmentStatus)
  status?: TeacherAssignmentStatus;
}
