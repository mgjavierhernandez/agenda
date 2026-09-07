import { IsString, IsOptional, IsEnum, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek, ScheduleStatus } from '@prisma/client';
import { TIME_PATTERN } from './create-schedule-block.dto';

export class UpdateScheduleBlockDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: DayOfWeek })
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @ApiPropertyOptional({ pattern: TIME_PATTERN })
  @IsOptional()
  @IsString()
  @Matches(new RegExp(TIME_PATTERN))
  startTime?: string;

  @ApiPropertyOptional({ pattern: TIME_PATTERN })
  @IsOptional()
  @IsString()
  @Matches(new RegExp(TIME_PATTERN))
  endTime?: string;

  @ApiPropertyOptional({ enum: ScheduleStatus })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;
}
