import { IsOptional, IsEnum } from 'class-validator';
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
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 20 })
  @IsOptional()
  limit?: number;
}
