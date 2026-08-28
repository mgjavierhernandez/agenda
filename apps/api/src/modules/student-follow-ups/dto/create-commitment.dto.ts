import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommitmentResponsibleRole } from '@prisma/client';

export class CreateCommitmentDto {
  @ApiProperty({ description: 'UUID of the responsible user' })
  @IsUUID()
  @IsNotEmpty()
  responsibleUserId!: string;

  @ApiProperty({ enum: CommitmentResponsibleRole })
  @IsEnum(CommitmentResponsibleRole)
  @IsNotEmpty()
  responsibleRole!: CommitmentResponsibleRole;

  @ApiProperty({ maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
