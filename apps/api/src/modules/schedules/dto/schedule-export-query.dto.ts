import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { DayOfWeek } from '@prisma/client';

export enum ScheduleExportFormat {
  PDF = 'pdf',
  XLSX = 'xlsx',
  CSV = 'csv',
}

export class ScheduleExportQueryDto {
  @ApiPropertyOptional({ enum: ScheduleExportFormat, default: ScheduleExportFormat.PDF })
  @IsOptional()
  @IsEnum(ScheduleExportFormat)
  format?: ScheduleExportFormat = ScheduleExportFormat.PDF;

  @ApiPropertyOptional({ enum: DayOfWeek })
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Restrict to courses of one accessible student',
  })
  @IsOptional()
  @IsUUID()
  studentId?: string;
}
