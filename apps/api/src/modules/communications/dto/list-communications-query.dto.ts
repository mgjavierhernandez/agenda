import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { CommunicationStatus, CommunicationAudience } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListCommunicationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CommunicationStatus })
  @IsOptional()
  @IsEnum(CommunicationStatus)
  status?: CommunicationStatus;

  @ApiPropertyOptional({ enum: CommunicationAudience })
  @IsOptional()
  @IsEnum(CommunicationAudience)
  audience?: CommunicationAudience;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  publishedFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  publishedTo?: string;
}
