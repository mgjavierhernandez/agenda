import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  FollowUpType,
  FollowUpSeverity,
  FollowUpConfidentiality,
} from '@prisma/client';

export class UpdateStudentFollowUpDto {
  @ApiPropertyOptional({ enum: FollowUpType })
  @IsOptional()
  @IsEnum(FollowUpType)
  type?: FollowUpType;

  @ApiPropertyOptional({ enum: FollowUpSeverity })
  @IsOptional()
  @IsEnum(FollowUpSeverity)
  severity?: FollowUpSeverity;

  @ApiPropertyOptional({ enum: FollowUpConfidentiality })
  @IsOptional()
  @IsEnum(FollowUpConfidentiality)
  confidentiality?: FollowUpConfidentiality;

  @ApiPropertyOptional({ description: 'UUID of the follow-up category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ minLength: 3, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
