import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportExportFormat {
  PDF = 'pdf',
  CSV = 'csv',
}

export class ReportsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Filter report data to an academic period. Omit to consolidate across all periods.',
  })
  @IsOptional()
  @IsUUID()
  academicPeriodId?: string;
}

export class ReportsExportQueryDto extends ReportsQueryDto {
  @ApiPropertyOptional({ enum: ReportExportFormat, default: ReportExportFormat.PDF })
  @IsOptional()
  @IsEnum(ReportExportFormat)
  format?: ReportExportFormat = ReportExportFormat.PDF;
}
