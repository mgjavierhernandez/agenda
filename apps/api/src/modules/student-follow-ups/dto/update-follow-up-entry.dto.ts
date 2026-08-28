import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FollowUpEntryType } from '@prisma/client';

export class UpdateFollowUpEntryDto {
  @ApiPropertyOptional({ enum: FollowUpEntryType })
  @IsOptional()
  @IsEnum(FollowUpEntryType)
  entryType?: FollowUpEntryType;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;
}
