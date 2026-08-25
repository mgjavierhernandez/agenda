import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEnrollmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  schoolGradeId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academicPeriodId!: string;
}
