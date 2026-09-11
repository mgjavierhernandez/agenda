import { IsString, IsNotEmpty, IsEnum, IsBoolean, IsOptional, IsUUID } from 'class-validator';
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

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Guardian user UUID. Defaults to the caller. Allows administrators to link any guardian.',
  })
  @IsOptional()
  @IsUUID()
  guardianUserId?: string;
}
