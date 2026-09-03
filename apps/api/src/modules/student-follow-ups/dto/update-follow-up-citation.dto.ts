import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FollowUpCitationStatus } from '@prisma/client';

export class UpdateFollowUpCitationDto {
  @ApiPropertyOptional({ description: 'ISO 8601 datetime' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional({ enum: FollowUpCitationStatus })
  @IsOptional()
  @IsEnum(FollowUpCitationStatus)
  status?: FollowUpCitationStatus;

  @ApiPropertyOptional({ description: 'Result or notes after the citation' })
  @IsOptional()
  @IsString()
  result?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 datetime of attendance' })
  @IsOptional()
  @IsDateString()
  attendedAt?: string;
}
