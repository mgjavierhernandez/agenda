import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, MaxLength, MinLength, IsInt, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { UpsertUserProfileDto } from './user-profile.dto';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com', maxLength: 255 })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ description: 'User password (min 8 characters)', minLength: 8, maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ description: 'User first name', example: 'John', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ description: 'User last name', example: 'Doe', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ type: UpsertUserProfileDto, description: 'Optional tenant-scoped personal/professional profile' })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpsertUserProfileDto)
  profile?: UpsertUserProfileDto;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User first name', example: 'John', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name', example: 'Doe', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'User email address', example: 'user@example.com', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'User status', enum: UserStatus, example: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class ListUsersQueryDto {
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
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search term', example: 'john' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: UserStatus, example: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
