import { IsUUID, IsNotEmpty, IsOptional, IsEnum, IsArray, ArrayMaxSize, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskAssignmentStatus } from '@prisma/client';

export class CreateTaskAssignmentDto {
  @ApiProperty({ description: 'Task UUID to assign', example: '550e8400-e29b-41d4-a716-446655440000', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  taskId!: string;

  @ApiPropertyOptional({ description: 'Array of student UUIDs to assign', example: ['550e8400-e29b-41d4-a716-446655440001'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(100)
  studentIds?: string[];

  @ApiPropertyOptional({ description: 'Enrollment UUID', example: '550e8400-e29b-41d4-a716-446655440002', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  enrollmentId?: string;
}

export class UpdateTaskAssignmentDto {
  @ApiPropertyOptional({ description: 'Assignment status', enum: TaskAssignmentStatus, example: TaskAssignmentStatus.COMPLETED })
  @IsOptional()
  @IsEnum(TaskAssignmentStatus)
  status?: TaskAssignmentStatus;
}

export class ListTaskAssignmentsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by task UUID', example: '550e8400-e29b-41d4-a716-446655440000', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Filter by student UUID', example: '550e8400-e29b-41d4-a716-446655440001', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: TaskAssignmentStatus, example: TaskAssignmentStatus.COMPLETED })
  @IsOptional()
  @IsEnum(TaskAssignmentStatus)
  status?: TaskAssignmentStatus;

  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;
}
