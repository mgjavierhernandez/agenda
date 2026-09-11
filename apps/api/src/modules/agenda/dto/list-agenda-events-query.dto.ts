import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AgendaEventStatus, CommunicationAudience } from '@prisma/client';

export class ListAgendaEventsQueryDto {
  @ApiPropertyOptional({ description: 'Only events that end at or after this datetime (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  start?: string;

  @ApiPropertyOptional({
    description: 'Only events that start at or before this datetime (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  end?: string;

  @ApiPropertyOptional({ enum: AgendaEventStatus, description: 'Filter by event status' })
  @IsOptional()
  @IsEnum(AgendaEventStatus)
  status?: AgendaEventStatus;

  @ApiPropertyOptional({ enum: CommunicationAudience, description: 'Filter by event audience' })
  @IsOptional()
  @IsEnum(CommunicationAudience)
  audience?: CommunicationAudience;

  @ApiPropertyOptional({ description: 'Search by title or description' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;
}
