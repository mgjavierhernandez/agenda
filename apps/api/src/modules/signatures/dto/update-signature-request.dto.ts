import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  MaxLength,
  MinLength,
  IsDateString,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSignatureRequestDto {
  @ApiPropertyOptional({ minLength: 3, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional({ type: [String], format: 'uuid', minItems: 1, maxItems: 100 })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  recipientUserIds?: string[];
}
