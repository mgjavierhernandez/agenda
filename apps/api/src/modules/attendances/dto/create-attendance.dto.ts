import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class CreateAttendanceDto {
  @ApiProperty({ description: 'UUID of the student' })
  @IsUUID()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ description: 'UUID of the course' })
  @IsUUID()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty({ description: 'UUID of the academic period' })
  @IsUUID()
  @IsNotEmpty()
  academicPeriodId!: string;

  @ApiProperty({ format: 'date', description: 'Attendance date (date-only)' })
  @IsDateString()
  @IsNotEmpty()
  date!: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status!: AttendanceStatus;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
