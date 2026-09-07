import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleStatus, DayOfWeek } from '@prisma/client';

export class CreateScheduleDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  subjectId!: string;

  @ApiProperty({ format: 'uuid', description: 'Período académico del horario' })
  @IsUUID()
  @IsNotEmpty()
  academicPeriodId!: string;

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

  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ApiProperty({ example: '08:00', description: 'Start time in HH:MM format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'startTime must be a valid time (HH:MM or HH:MM:SS)',
  })
  startTime!: string;

  @ApiProperty({ example: '10:00', description: 'End time in HH:MM format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'endTime must be a valid time (HH:MM or HH:MM:SS)',
  })
  endTime!: string;

  @ApiPropertyOptional({ enum: ScheduleStatus })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;
}
