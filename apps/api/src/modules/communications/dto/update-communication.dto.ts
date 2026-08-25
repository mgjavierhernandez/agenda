import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
  IsDateString,
} from 'class-validator';
import { CommunicationAudience } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCommunicationDto {
  @ApiPropertyOptional({ minLength: 3, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({ enum: CommunicationAudience })
  @IsOptional()
  @IsEnum(CommunicationAudience)
  audience?: CommunicationAudience;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
