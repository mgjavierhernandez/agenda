import { IsString, IsOptional, IsInt, IsBoolean, IsEnum, MaxLength, Min } from 'class-validator';
import { SubjectStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAreaDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOfficial?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: SubjectStatus })
  @IsOptional()
  @IsEnum(SubjectStatus)
  status?: SubjectStatus;
}