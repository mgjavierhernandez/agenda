import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetDashboardQueryDto {
  @ApiPropertyOptional({ description: 'Academic period ID to filter dashboard data' })
  @IsOptional()
  @IsString()
  @IsUUID()
  periodId?: string;
}
