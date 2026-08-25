import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeacherAssignmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherUserId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academicPeriodId!: string;
}
