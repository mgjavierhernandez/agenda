import { IsString, IsOptional, IsInt, IsEnum, MaxLength, Min } from 'class-validator';
import { SchoolGradeStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSchoolGradeDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: SchoolGradeStatus })
  @IsOptional()
  @IsEnum(SchoolGradeStatus)
  status?: SchoolGradeStatus;
}
