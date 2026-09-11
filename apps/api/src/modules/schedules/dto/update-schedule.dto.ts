import { IsString, IsOptional, IsEnum, IsUUID, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleStatus, DayOfWeek } from '@prisma/client';

export class UpdateScheduleDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Período académico del horario' })
  @IsOptional()
  @IsUUID()
  academicPeriodId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Docente que dicta la clase' })
  @IsOptional()
  @IsUUID()
  teacherUserId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Aula/espacio asignado' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Bloque horario (jornada)' })
  @IsOptional()
  @IsUUID()
  blockId?: string;

  @ApiPropertyOptional({ enum: DayOfWeek })
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @ApiPropertyOptional({ example: '08:00', description: 'Start time in HH:MM format' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'startTime must be a valid time (HH:MM or HH:MM:SS)',
  })
  startTime?: string;

  @ApiPropertyOptional({ example: '10:00', description: 'End time in HH:MM format' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'endTime must be a valid time (HH:MM or HH:MM:SS)',
  })
  endTime?: string;

  @ApiPropertyOptional({ enum: ScheduleStatus })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;
}
