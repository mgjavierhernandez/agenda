import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email for password reset', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token', example: 'abc123resettoken' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ description: 'New password (min 8 characters)', minLength: 8, maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
