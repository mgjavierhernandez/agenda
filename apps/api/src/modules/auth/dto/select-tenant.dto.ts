import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectTenantDto {
  @ApiProperty({ description: 'Institution UUID to select as active tenant', example: '550e8400-e29b-41d4-a716-446655440000', format: 'uuid' })
  @IsUUID()
  @IsString()
  @IsNotEmpty()
  institutionId!: string;
}
