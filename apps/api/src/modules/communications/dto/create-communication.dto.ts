import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
  IsDateString,
} from 'class-validator';
import { CommunicationAudience } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommunicationDto {
  @ApiProperty({ minLength: 3, maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ minLength: 1 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  content!: string;

  @ApiProperty({ enum: CommunicationAudience })
  @IsEnum(CommunicationAudience)
  @IsNotEmpty()
  audience!: CommunicationAudience;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
