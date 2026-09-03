import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

/**
 * Attendance update DTO.
 *
 * Integrity-first design: identifying fields (studentId, courseId,
 * academicPeriodId, date) are immutable after creation to preserve the
 * historical record and the unique (student, course, date) invariant.
 * Only the mutable status and notes may be changed.
 */
export class UpdateAttendanceDto {
  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
