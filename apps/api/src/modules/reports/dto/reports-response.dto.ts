import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportStudentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  documentType!: string;

  @ApiProperty()
  documentNumber!: string;

  @ApiProperty()
  status!: string;
}

export class ReportAcademicPeriodDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  startDate!: string;

  @ApiProperty()
  endDate!: string;
}

export class ReportEnrollmentDto {
  @ApiProperty({ format: 'uuid' })
  courseId!: string;

  @ApiProperty()
  courseCode!: string;

  @ApiProperty()
  courseName!: string;

  @ApiProperty({ format: 'uuid' })
  schoolGradeId!: string;

  @ApiProperty()
  schoolGradeName!: string;

  @ApiProperty()
  enrolledAt!: string;
}

export class ReportGradeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: Number, example: 4.5 })
  value!: number;

  @ApiProperty()
  period!: string;

  @ApiPropertyOptional({ nullable: true })
  evaluationType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ReportSubjectDto {
  @ApiProperty({ format: 'uuid' })
  subjectId!: string;

  @ApiProperty()
  subjectCode!: string;

  @ApiProperty()
  subjectName!: string;

  @ApiProperty({ type: [ReportGradeDto] })
  grades!: ReportGradeDto[];

  @ApiPropertyOptional({ type: Number, nullable: true })
  simpleAverage?: number | null;

  @ApiPropertyOptional({
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
    },
    additionalProperties: false,
    nullable: true,
  })
  teacher?: { id: string; firstName: string; lastName: string } | null;
}

export class ReportAttendanceSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  present!: number;

  @ApiProperty()
  absent!: number;

  @ApiProperty()
  late!: number;

  @ApiProperty()
  excused!: number;
}

export class ReportObservadorDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  open!: number;

  @ApiProperty()
  resolved!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    description: 'Counts by confidentiality level visible to the actor',
  })
  byConfidentiality!: Record<string, number>;
}

export class ReportInstitutionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

class StudentReportBaseDto {
  @ApiProperty({ type: ReportStudentDto })
  student!: ReportStudentDto;

  @ApiProperty({ type: ReportInstitutionDto })
  institution!: ReportInstitutionDto;

  @ApiPropertyOptional({ type: ReportAcademicPeriodDto, nullable: true })
  academicPeriod: ReportAcademicPeriodDto | null = null;

  @ApiPropertyOptional({ type: ReportEnrollmentDto, nullable: true })
  enrollment: ReportEnrollmentDto | null = null;

  @ApiProperty({ type: [ReportSubjectDto] })
  academic!: ReportSubjectDto[];

  @ApiProperty({ type: ReportAttendanceSummaryDto })
  attendance!: ReportAttendanceSummaryDto;

  @ApiProperty({ type: ReportObservadorDto })
  observador!: ReportObservadorDto;
}

export class StudentReportDto extends StudentReportBaseDto {}

export class StudentBulletinDto extends StudentReportBaseDto {}

export class ReportCourseStudentDto {
  @ApiProperty({ type: ReportStudentDto })
  student!: ReportStudentDto;

  @ApiPropertyOptional({ nullable: true })
  schoolGradeName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  enrolledAt?: string | null;

  @ApiProperty()
  subjectCount!: number;

  @ApiProperty()
  gradeCount!: number;

  @ApiPropertyOptional({ type: Number, nullable: true })
  simpleAverage?: number | null;

  @ApiProperty({ type: ReportAttendanceSummaryDto })
  attendance!: ReportAttendanceSummaryDto;
}

export class CourseReportSummaryDto {
  @ApiProperty()
  totalStudents!: number;

  @ApiProperty()
  studentsWithGrades!: number;

  @ApiProperty()
  studentsWithAttendance!: number;
}

export class ReportCourseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;
}

export class CourseReportDto {
  @ApiProperty({ type: ReportCourseDto })
  course!: ReportCourseDto;

  @ApiPropertyOptional({ type: ReportAcademicPeriodDto, nullable: true })
  academicPeriod: ReportAcademicPeriodDto | null = null;

  @ApiProperty({ type: [ReportCourseStudentDto] })
  students!: ReportCourseStudentDto[];

  @ApiProperty({ type: CourseReportSummaryDto })
  summary!: CourseReportSummaryDto;
}
