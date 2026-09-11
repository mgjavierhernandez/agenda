import { IsString, IsOptional, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

export class UpsertUserProfileDto {
  @ApiPropertyOptional({
    enum: DocumentType,
    description: 'Document type (must be sent together with documentNumber)',
  })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional({
    maxLength: 50,
    description: 'Document number (must be sent together with documentType)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumber?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ format: 'date', description: 'Birth date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  profession?: string;

  @ApiPropertyOptional({ description: 'Professional profile / bio' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}
