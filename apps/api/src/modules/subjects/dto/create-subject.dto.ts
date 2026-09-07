import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubjectStatus, SubjectType, EducationLevel } from '@prisma/client';

export class CreateSubjectDto {
  @ApiProperty({ maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  areaId?: string;

  @ApiPropertyOptional({ enum: SubjectType })
  @IsOptional()
  @IsEnum(SubjectType)
  subjectType?: SubjectType;

  @ApiPropertyOptional({ enum: EducationLevel })
  @IsOptional()
  @IsEnum(EducationLevel)
  minimumLevel?: EducationLevel;

  @ApiPropertyOptional({ enum: EducationLevel })
  @IsOptional()
  @IsEnum(EducationLevel)
  maximumLevel?: EducationLevel;

  @ApiPropertyOptional({ enum: SubjectStatus })
  @IsOptional()
  @IsEnum(SubjectStatus)
  status?: SubjectStatus;
}