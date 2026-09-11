import { IsUUID, IsNotEmpty, IsOptional, IsEnum, IsArray, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipStatus } from '@prisma/client';

export class LinkUserDto {
  @ApiProperty({ description: 'User UUID to link', example: '550e8400-e29b-41d4-a716-446655440000', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiPropertyOptional({ description: 'Array of role UUIDs to assign', example: ['550e8400-e29b-41d4-a716-446655440001'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}

export class UpdateMembershipDto {
  @ApiPropertyOptional({ description: 'Membership status', enum: MembershipStatus, example: MembershipStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}

export class AssignRoleDto {
  @ApiProperty({ description: 'Role UUID to assign', example: '550e8400-e29b-41d4-a716-446655440001', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  roleId!: string;
}

export class ListMembershipsQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by status', enum: MembershipStatus, example: MembershipStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;

  @ApiPropertyOptional({ description: 'Search term', example: 'john' })
  @IsOptional()
  @IsString()
  search?: string;
}
