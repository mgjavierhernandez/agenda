import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CommunicationAudience } from '@prisma/client';

export class UpdateAgendaEventDto {
  @ApiPropertyOptional({ description: 'Event title', example: 'Reunion de padres' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Event description (null clears it)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ description: 'Event start datetime (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ description: 'Event end datetime (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ description: 'Event location (null clears it)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string | null;

  @ApiPropertyOptional({ enum: CommunicationAudience })
  @IsOptional()
  @IsEnum(CommunicationAudience)
  audience?: CommunicationAudience;
}
