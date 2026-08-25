import { IsString, IsNotEmpty, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAcademicPeriodDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  endDate!: string;
}
