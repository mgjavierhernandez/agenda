import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsUUID,
  IsIn,
  MaxLength,
  MinLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UpsertUserProfileDto } from '../../users/dto/user-profile.dto';

export const SELF_REGISTER_ROLES = ['TEACHER', 'PARENT', 'STUDENT'] as const;
export type SelfRegisterRole = (typeof SELF_REGISTER_ROLES)[number];

export class SelfRegisterDto {
  @ApiProperty({ maxLength: 255 })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Target institution UUID (institutionId or institutionSlug required)' })
  @ValidateIf((o: SelfRegisterDto) => !o.institutionSlug)
  @IsUUID()
  @IsNotEmpty()
  institutionId?: string;

  @ApiPropertyOptional({ description: 'Target institution slug (institutionId or institutionSlug required)' })
  @ValidateIf((o: SelfRegisterDto) => !o.institutionId)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  institutionSlug?: string;

  @ApiProperty({ enum: SELF_REGISTER_ROLES, description: 'Requested role (admin assigns it on approval)' })
  @IsIn([...SELF_REGISTER_ROLES])
  @IsNotEmpty()
  requestedRole!: SelfRegisterRole;

  @ApiPropertyOptional({ type: UpsertUserProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpsertUserProfileDto)
  profile?: UpsertUserProfileDto;
}
