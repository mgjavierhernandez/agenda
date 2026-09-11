import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunicationRecipientStatus } from '@prisma/client';

export class UpdateRecipientStatusDto {
  @ApiProperty({ description: 'Recipient status', enum: CommunicationRecipientStatus, example: CommunicationRecipientStatus.DELIVERED })
  @IsEnum(CommunicationRecipientStatus)
  status!: CommunicationRecipientStatus;
}

export class ListRecipientsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: CommunicationRecipientStatus, example: CommunicationRecipientStatus.DELIVERED })
  @IsOptional()
  @IsEnum(CommunicationRecipientStatus)
  status?: CommunicationRecipientStatus;

  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;
}
