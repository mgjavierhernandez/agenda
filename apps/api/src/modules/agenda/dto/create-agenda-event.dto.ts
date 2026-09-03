import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CommunicationAudience } from '@prisma/client';

export class CreateAgendaEventDto {
  @ApiProperty({ description: 'Event title', example: 'Reunion de padres' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ description: 'Event description', example: 'Salon de actos, 18:00 hs' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Event start datetime (ISO 8601)', example: '2026-09-01T14:00:00.000Z' })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ description: 'Event end datetime (ISO 8601)', example: '2026-09-01T16:00:00.000Z' })
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional({ description: 'Event location', example: 'Salon de actos' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ enum: CommunicationAudience, default: CommunicationAudience.ALL })
  @IsOptional()
  @IsEnum(CommunicationAudience)
  audience?: CommunicationAudience;
}