import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum AgendaView {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum AgendaEventType {
  SCHEDULE = 'SCHEDULE',
  TASK = 'TASK',
  COMMUNICATION = 'COMMUNICATION',
  SIGNATURE = 'SIGNATURE',
  EVENT = 'EVENT',
}

export class ListAgendaQueryDto {
  @ApiProperty({ description: 'Start date (ISO 8601)', example: '2026-08-24' })
  @IsDateString()
  start!: string;

  @ApiProperty({ description: 'End date (ISO 8601)', example: '2026-08-30' })
  @IsDateString()
  end!: string;

  @ApiPropertyOptional({ enum: AgendaView, default: AgendaView.WEEK })
  @IsOptional()
  @IsEnum(AgendaView)
  view?: AgendaView = AgendaView.WEEK;

  @ApiPropertyOptional({ enum: AgendaEventType, isArray: true, description: 'Filter by event types' })
  @IsOptional()
  @IsEnum(AgendaEventType, { each: true })
  eventTypes?: AgendaEventType[];

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 200, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 200;
}
