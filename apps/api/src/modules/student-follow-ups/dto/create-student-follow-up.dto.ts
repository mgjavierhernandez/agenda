import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FollowUpType,
  FollowUpSeverity,
  FollowUpConfidentiality,
} from '@prisma/client';

export class CreateStudentFollowUpDto {
  @ApiProperty({ description: 'UUID of the student' })
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ enum: FollowUpType })
  @IsEnum(FollowUpType)
  @IsNotEmpty()
  type!: FollowUpType;

  @ApiPropertyOptional({ enum: FollowUpSeverity, default: FollowUpSeverity.MEDIUM })
  @IsOptional()
  @IsEnum(FollowUpSeverity)
  severity?: FollowUpSeverity;

  @ApiPropertyOptional({
    enum: FollowUpConfidentiality,
    default: FollowUpConfidentiality.INTERNAL,
  })
  @IsOptional()
  @IsEnum(FollowUpConfidentiality)
  confidentiality?: FollowUpConfidentiality;

  @ApiPropertyOptional({ description: 'UUID of the follow-up category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

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
