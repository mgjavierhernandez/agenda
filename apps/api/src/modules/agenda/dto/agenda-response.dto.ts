import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgendaEventType } from './list-agenda-query.dto';

export class AgendaEventDto {
  @ApiProperty({ description: 'Unique event identifier' })
  id!: string;

  @ApiProperty({ enum: AgendaEventType, description: 'Event source type' })
  type!: AgendaEventType;

  @ApiProperty({ description: 'Event title' })
  title!: string;

  @ApiPropertyOptional({ description: 'Event description' })
  description?: string;

  @ApiProperty({ description: 'Event start datetime (ISO 8601)' })
  start!: string;

  @ApiPropertyOptional({ description: 'Event end datetime (ISO 8601)' })
  end?: string;

  @ApiProperty({ description: 'Whether event spans full day' })
  allDay!: boolean;

  @ApiProperty({ description: 'Event status' })
  status!: string;

  @ApiProperty({ description: 'Source entity ID' })
  sourceId!: string;

  @ApiProperty({ description: 'Source entity type' })
  sourceType!: string;

  @ApiPropertyOptional({ description: 'Route to navigate to detail page' })
  route?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, unknown>;
}

export class AgendaResponseDto {
  @ApiProperty({ type: [AgendaEventDto] })
  data!: AgendaEventDto[];

  @ApiProperty({ description: 'Date range start' })
  start!: string;

  @ApiProperty({ description: 'Date range end' })
  end!: string;

  @ApiProperty({ description: 'Total events in range' })
  total!: number;
}
