import { IsString, IsOptional, IsEnum, IsUUID, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CommitmentResponsibleRole, CommitmentStatus } from '@prisma/client';

export class UpdateCommitmentDto {
  @ApiPropertyOptional({ description: 'UUID of the responsible user' })
  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @ApiPropertyOptional({ enum: CommitmentResponsibleRole })
  @IsOptional()
  @IsEnum(CommitmentResponsibleRole)
  responsibleRole?: CommitmentResponsibleRole;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: CommitmentStatus })
  @IsOptional()
  @IsEnum(CommitmentStatus)
  status?: CommitmentStatus;
}
