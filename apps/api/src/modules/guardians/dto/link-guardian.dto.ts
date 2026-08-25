import { IsString, IsNotEmpty, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { RelationshipType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkGuardianDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ enum: RelationshipType })
  @IsEnum(RelationshipType)
  @IsNotEmpty()
  relationshipType!: RelationshipType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
