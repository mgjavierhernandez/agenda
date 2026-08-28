import {
  IsString,
  IsNotEmpty,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FollowUpEntryType } from '@prisma/client';

export class CreateFollowUpEntryDto {
  @ApiProperty({ enum: FollowUpEntryType })
  @IsEnum(FollowUpEntryType)
  @IsNotEmpty()
  entryType!: FollowUpEntryType;

  @ApiProperty({ maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;
}
