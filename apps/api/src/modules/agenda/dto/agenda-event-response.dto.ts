import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgendaEventStatus, CommunicationAudience } from '@prisma/client';

export class AgendaEventCreatedByDto {
  @ApiProperty({ description: 'Creator user id' })
  id!: string;

  @ApiProperty({ description: 'Creator first name' })
  firstName!: string;

  @ApiProperty({ description: 'Creator last name' })
  lastName!: string;
}

export class AgendaEventResponseDto {
  @ApiProperty({ description: 'Unique event identifier' })
  id!: string;

  @ApiProperty({ description: 'Event title' })
  title!: string;

  @ApiPropertyOptional({ description: 'Event description' })
  description?: string | null;

  @ApiProperty({ description: 'Event start datetime (ISO 8601)' })
  startAt!: string;

  @ApiProperty({ description: 'Event end datetime (ISO 8601)' })
  endAt!: string;

  @ApiPropertyOptional({ description: 'Event location' })
  location?: string | null;

  @ApiProperty({ enum: CommunicationAudience, description: 'Who can see the event' })
  audience!: CommunicationAudience;

  @ApiProperty({ enum: AgendaEventStatus, description: 'Event lifecycle status' })
  status!: AgendaEventStatus;

  @ApiProperty({ description: 'Creation timestamp (ISO 8601)' })
  createdAt!: string;

  @ApiProperty({ description: 'Last update timestamp (ISO 8601)' })
  updatedAt!: string;

  @ApiPropertyOptional({ type: AgendaEventCreatedByDto, description: 'User who created the event' })
  createdBy?: AgendaEventCreatedByDto;
}