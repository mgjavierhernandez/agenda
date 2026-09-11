import { IsString, IsNotEmpty, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFollowUpCitationDto {
  @ApiProperty({
    description: 'ISO 8601 datetime for the citation',
    example: '2026-09-10T14:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt!: string;

  @ApiProperty({ maxLength: 500, description: 'Reason/purpose for the citation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ description: 'Objective or goal of the citation' })
  @IsOptional()
  @IsString()
  objective?: string;
}
