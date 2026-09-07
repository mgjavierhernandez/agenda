import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek, ScheduleStatus } from '@prisma/client';

export const TIME_PATTERN = '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$';

export class CreateScheduleBlockDto {
  @ApiProperty({ maxLength: 100, example: 'Bloque 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  dayOfWeek!: DayOfWeek;

  @ApiProperty({ example: '07:00', pattern: TIME_PATTERN })
  @IsString()
  @IsNotEmpty()
  @Matches(new RegExp(TIME_PATTERN))
  startTime!: string;

  @ApiProperty({ example: '08:00', pattern: TIME_PATTERN })
  @IsString()
  @IsNotEmpty()
  @Matches(new RegExp(TIME_PATTERN))
  endTime!: string;

  @ApiPropertyOptional({ enum: ScheduleStatus })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;
}
