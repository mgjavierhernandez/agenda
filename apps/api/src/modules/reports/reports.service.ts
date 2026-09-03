import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import {
  ReportsAuthorizationService,
} from './reports-authorization';
import { StudentFollowUpAuthorizationService } from '../../common/auth/student-follow-up-authorization';
import { buildReportPdf, PdfReportPayload } from './report-pdf';
import { toCsv } from './report-csv';
import { AttendanceStatus, FollowUpStatus } from '@prisma/client';
import {
  StudentReportDto,
  StudentBulletinDto,
  CourseReportDto,
} from './dto/reports-response.dto';

export interface ReportFileResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

const OPEN_FOLLOW_UP_STATUSES: FollowUpStatus[] = [
  FollowUpStatus.OPEN,
  FollowUpStatus.IN_PROGRESS,
  FollowUpStatus.PENDING_FOLLOW_UP,
  FollowUpStatus.ESCALATED,
];

const RESOLVED_FOLLOW_UP_STATUSES: FollowUpStatus[] = [
  FollowUpStatus.RESOLVED,
  FollowUpStatus.CLOSED,
];

interface BaseContext {
  studentId: string;
  institution: { id: string; name: string; slug: string };
  academicPeriod: {
    id: string;
    name: string;
    code: string;
    status: string;
    startDate: string;
    endDate: string;
  } | null;
  enrollment: {
    courseId: string;
    courseCode: string;
    courseName: string;
    schoolGradeId: string;
    schoolGradeName: string;
    enrolledAt: string;
  } | null;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authorizationService: ReportsAuthorizationService,
    private readonly followUpAuthorization: StudentFollowUpAuthorizationService,
  ) {}

  async getStudentReport(
    userId: string,
    institutionId: string,
    studentId: string,
    academicPeriodId: string | null,
  ): Promise<StudentReportDto> {
    const role = await this.assertStudentAccess(userId, institutionId, studentId, academicPeriodId);
    return this.buildStudentConsolidation(userId, institutionId, studentId, academicPeriodId, role, true);
  }

  async getStudentBulletin(
    userId: string,
    institutionId: string,
    studentId: string,
    academicPeriodId: string | null,
  ): Promise<StudentBulletinDto> {
    const role = await this.assertStudentAccess(userId, institutionId, studentId, academicPeriodId);
    return this.buildStudentConsolidation(userId, institutionId, studentId, academicPeriodId, role, false);
  }

  async getCourseReport(
    userId: string,
    institutionId: string,
    courseId: string,
    academicPeriodId: string | null,
  ): Promise<CourseReportDto> {
    await this.assertCourseAccess(userId, institutionId, courseId, academicPeriodId);
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, institutionId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const period = await this.resolvePeriod(institutionId, academicPeriodId);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        institutionId,
        courseId,
        status: 'ACTIVE',
        ...(academicPeriodId ? { academicPeriodId } : {}),
      },
      include: {
        student: true,
        schoolGrade: true,
      },
      orderBy: { student: { lastName: 'asc' } },
    });

    const studentIds = enrollments.map((e) => e.studentId);

    const [grades, attendanceRows] = await Promise.all([
      this.prisma.grade.findMany({
        where: {
          institutionId,
          courseId,
          studentId: { in: studentIds },
          status: 'ACTIVE',
          ...(academicPeriodId ? { academicPeriodId } : {}),
        },
        select: { studentId: true, subjectId: true, value: true },
      }),
      this.prisma.attendance.groupBy({
        by: ['studentId', 'status'],
        where: {
          institutionId,
          courseId,
          studentId: { in: studentIds },
          ...(academicPeriodId ? { academicPeriodId } : {}),
        },
        _count: { _all: true },
      }),
    ]);

    const gradesByStudent = new Map<string, Array<{ subjectId: string; value: number }>>();
    for (const g of grades) {
      const list = gradesByStudent.get(g.studentId) ?? [];
      list.push({ subjectId: g.subjectId, value: Number(g.value) });
      gradesByStudent.set(g.studentId, list);
    }

    const attendanceByStudent = new Map<
      string,
      Record<string, number>
    >();
    for (const row of attendanceRows) {
      const map = attendanceByStudent.get(row.studentId) ?? {};
      map[row.status] = row._count._all;
      attendanceByStudent.set(row.studentId, map);
    }

    const students = enrollments.map((enrollment) => {
      const grades = gradesByStudent.get(enrollment.studentId) ?? [];
      const subjectIds = new Set(grades.map((g) => g.subjectId));
      const att = attendanceByStudent.get(enrollment.studentId) ?? {};
      const subjectCount = subjectIds.size;
      const simpleAverage =
        grades.length > 0
          ? this.round2(grades.reduce((acc, g) => acc + g.value, 0) / grades.length)
          : null;

      return {
        student: {
          id: enrollment.student.id,
          firstName: enrollment.student.firstName,
          lastName: enrollment.student.lastName,
          documentType: enrollment.student.documentType,
          documentNumber: enrollment.student.documentNumber,
          status: enrollment.student.status,
        },
        schoolGradeName: enrollment.schoolGrade?.name ?? null,
        enrolledAt: enrollment.enrolledAt.toISOString(),
        subjectCount,
        gradeCount: grades.length,
        simpleAverage,
        attendance: this.buildAttendanceSummary(att),
      };
    });

    const summary = {
      totalStudents: students.length,
      studentsWithGrades: students.filter((s) => s.gradeCount > 0).length,
      studentsWithAttendance: students.filter((s) => s.attendance.total > 0).length,
    };

    const periodDto = period
      ? {
          id: period.id,
          name: period.name,
          code: period.code,
          status: period.status,
          startDate: this.toDateString(period.startDate),
          endDate: this.toDateString(period.endDate),
        }
      : null;

    return {
      course: {
        id: course.id,
        code: course.code,
        name: course.name,
        status: course.status,
        description: course.description ?? null,
      },
      academicPeriod: periodDto,
      students,
      summary,
    };
  }

  async exportStudentReport(
    userId: string,
    institutionId: string,
    studentId: string,
    academicPeriodId: string | null,
    format: 'pdf' | 'csv',
    ipAddress?: string,
  ): Promise<ReportFileResult> {
    const role = await this.assertStudentAccess(userId, institutionId, studentId, academicPeriodId);
    const payload = await this.buildStudentConsolidation(
      userId,
      institutionId,
      studentId,
      academicPeriodId,
      role,
      true,
    );
    const result = await this.renderStudentReportFile(
      institutionId,
      studentId,
      payload,
      'REPORTE ACADÉMICO INDIVIDUAL',
      'reporte-individual',
      format,
    );
    await this.auditService.log({
      userId,
      institutionId,
      action: 'REPORT_EXPORTED',
      entityType: 'Report',
      entityId: studentId,
      newValues: {
        reportType: 'individual',
        academicPeriodId: academicPeriodId ?? undefined,
        format,
      },
      ipAddress,
    });
    return result;
  }

  async exportStudentBulletin(
    userId: string,
    institutionId: string,
    studentId: string,
    academicPeriodId: string | null,
    format: 'pdf' | 'csv',
    ipAddress?: string,
  ): Promise<ReportFileResult> {
    const role = await this.assertStudentAccess(userId, institutionId, studentId, academicPeriodId);
    const payload = await this.buildStudentConsolidation(
      userId,
      institutionId,
      studentId,
      academicPeriodId,
      role,
      false,
    );
    const result = await this.renderStudentReportFile(
      institutionId,
      studentId,
      payload,
      'BOLETÍN ACADÉMICO',
      'boletin',
      format,
    );
    await this.auditService.log({
      userId,
      institutionId,
      action: 'BULLETIN_EXPORTED',
      entityType: 'Bulletin',
      entityId: studentId,
      newValues: {
        reportType: 'bulletin',
        academicPeriodId: academicPeriodId ?? undefined,
        format,
      },
      ipAddress,
    });
    return result;
  }

  async exportCourseReportCsv(
    userId: string,
    institutionId: string,
    courseId: string,
    academicPeriodId: string | null,
    ipAddress?: string,
  ): Promise<ReportFileResult> {
    await this.assertCourseAccess(userId, institutionId, courseId, academicPeriodId);
    const report = await this.getCourseReport(userId, institutionId, courseId, academicPeriodId);

    const headers = [
      'Estudiante',
      'Documento',
      'Curso',
      'Período',
      'Grado',
      'Materias con nota',
      'N. calificaciones',
      'Promedio simple',
      'Asistencias',
      'Presentes',
      'Ausentes',
      'Tardes',
      'Excusadas',
    ];

    const rows = report.students.map((s) => [
      `${s.student.lastName}, ${s.student.firstName}`,
      s.student.documentNumber,
      report.course.code,
      report.academicPeriod?.name ?? 'Sin período',
      s.schoolGradeName ?? '',
      s.subjectCount,
      s.gradeCount,
      s.simpleAverage != null ? s.simpleAverage.toFixed(2) : '',
      s.attendance.total,
      s.attendance.present,
      s.attendance.absent,
      s.attendance.late,
      s.attendance.excused,
    ]);

    await this.auditService.log({
      userId,
      institutionId,
      action: 'REPORT_EXPORTED',
      entityType: 'Report',
      entityId: courseId,
      newValues: {
        reportType: 'course',
        academicPeriodId: academicPeriodId ?? undefined,
        format: 'csv',
      },
      ipAddress,
    });

    return {
      buffer: toCsv(headers, rows),
      filename: `reporte-curso-${courseId}.csv`,
      contentType: 'text/csv; charset=utf-8',
    };
  }

  private async buildStudentConsolidation(
    userId: string,
    institutionId: string,
    studentId: string,
    academicPeriodId: string | null,
    role: string,
    includeTeacher: boolean,
  ): Promise<StudentReportDto & { institution: { id: string; name: string; slug: string } }> {
    const ctx = await this.loadStudentContext(institutionId, studentId, academicPeriodId);

    const subjectFilter = academicPeriodId
      ? { academicPeriodId }
      : {};

    const [grades, attendanceRows, teacherAssignments, followUps] = await Promise.all([
      this.prisma.grade.findMany({
        where: {
          institutionId,
          studentId,
          status: 'ACTIVE',
          ...subjectFilter,
        },
        include: {
          subject: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.attendance.groupBy({
        by: ['status'],
        where: {
          institutionId,
          studentId,
          ...subjectFilter,
        },
        _count: { _all: true },
      }),
      includeTeacher && ctx.enrollment
        ? this.prisma.teacherAssignment.findMany({
            where: {
              institutionId,
              courseId: ctx.enrollment.courseId,
              status: 'ACTIVE',
              ...subjectFilter,
            },
            include: {
              teacherUser: { select: { id: true, firstName: true, lastName: true } },
              subject: { select: { id: true } },
            },
          })
        : Promise.resolve([] as Array<{
            subject: { id: string };
            teacherUser: { id: string; firstName: string; lastName: string };
          }>),
      this.prisma.studentFollowUp.findMany({
        where: {
          institutionId,
          studentId,
          confidentiality: {
            in: this.followUpAuthorization.getVisibleConfidentialityLevels(role),
          },
        },
        select: { status: true, confidentiality: true },
      }),
    ]);

    const teacherBySubject = new Map<string, { id: string; firstName: string; lastName: string }>();
    for (const ta of teacherAssignments) {
      if (!teacherBySubject.has(ta.subject.id)) {
        teacherBySubject.set(ta.subject.id, {
          id: ta.teacherUser.id,
          firstName: ta.teacherUser.firstName,
          lastName: ta.teacherUser.lastName,
        });
      }
    }

    const gradesBySubject = new Map<string, typeof grades>();
    for (const grade of grades) {
      const list = gradesBySubject.get(grade.subjectId) ?? [];
      list.push(grade);
      gradesBySubject.set(grade.subjectId, list);
    }

    const academic = Array.from(gradesBySubject.entries())
      .map(([subjectId, list]) => {
        const sorted = [...list].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        const values = sorted.map((g) => Number(g.value));
        const simpleAverage =
          values.length > 0
            ? this.round2(values.reduce((acc, v) => acc + v, 0) / values.length)
            : null;

        return {
          subjectId,
          subjectCode: sorted[0].subject.code,
          subjectName: sorted[0].subject.name,
          grades: sorted.map((g) => ({
            id: g.id,
            value: Number(g.value),
            period: g.period,
            evaluationType: g.evaluationType ?? null,
            description: g.description ?? null,
            status: g.status,
            updatedAt: g.updatedAt.toISOString(),
          })),
          simpleAverage,
          teacher: includeTeacher ? (teacherBySubject.get(subjectId) ?? null) : null,
        };
      })
      .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode));

    const attendanceMap: Record<string, number> = {};
    for (const row of attendanceRows) {
      attendanceMap[row.status] = row._count._all;
    }

    const observador = this.buildObservadorSummary(followUps);

    return {
      student: {
        id: studentId,
        firstName: ctx.studentFirstName,
        lastName: ctx.studentLastName,
        documentType: ctx.documentType,
        documentNumber: ctx.documentNumber,
        status: ctx.studentStatus,
      },
      institution: ctx.institution,
      academicPeriod: ctx.academicPeriod,
      enrollment: ctx.enrollment,
      academic,
      attendance: this.buildAttendanceSummary(attendanceMap),
      observador,
    };
  }

  private async renderStudentReportFile(
    institutionId: string,
    studentId: string,
    payload: StudentReportDto & { institution: { id: string; name: string; slug: string } },
    title: string,
    slug: string,
    format: 'pdf' | 'csv',
  ): Promise<ReportFileResult> {
    if (format === 'csv') {
      const headers = [
        'Asignatura',
        'Evaluación',
        'Calificación',
        'Observación',
        'Promedio simple',
        'Docente',
      ];
      const rows: Array<Array<string | number | null | undefined>> = [];
      for (const subject of payload.academic) {
        for (const grade of subject.grades) {
          rows.push([
            subject.subjectName,
            grade.evaluationType ?? '',
            grade.value,
            grade.description ?? '',
            subject.simpleAverage != null ? subject.simpleAverage.toFixed(2) : '',
            subject.teacher ? `${subject.teacher.firstName} ${subject.teacher.lastName}` : '',
          ]);
        }
        if (subject.grades.length === 0) {
          rows.push([subject.subjectName, '', '', '', subject.simpleAverage?.toFixed(2) ?? '', '']);
        }
      }
      return {
        buffer: toCsv(headers, rows),
        filename: `${slug}-${studentId}.csv`,
        contentType: 'text/csv; charset=utf-8',
      };
    }

    const pdfPayload: PdfReportPayload = {
      institutionName: payload.institution.name,
      title,
      metaLines: [
        { label: 'Estudiante', value: `${payload.student.firstName} ${payload.student.lastName}` },
        { label: 'Documento', value: payload.student.documentNumber },
        { label: 'Curso', value: payload.enrollment ? `${payload.enrollment.courseName} (${payload.enrollment.courseCode})` : 'Sin matrícula activa' },
        { label: 'Grado', value: payload.enrollment ? payload.enrollment.schoolGradeName : '—' },
        { label: 'Período', value: payload.academicPeriod ? `${payload.academicPeriod.name} (${payload.academicPeriod.code})` : 'Consolidado — todos los períodos' },
        { label: 'Fecha de generación', value: new Date().toISOString().slice(0, 10) },
      ],
      academicSections: payload.academic.map((subject) => ({
        subjectName: subject.subjectName,
        rows: subject.grades.map((g) => ({
          evaluationType: g.evaluationType ?? '—',
          value: String(g.value),
          observation: g.description,
        })),
        simpleAverage: subject.simpleAverage,
      })),
      attendanceLines: [
        { label: 'Asistencias registradas', value: String(payload.attendance.total) },
        { label: 'Presentes', value: String(payload.attendance.present) },
        { label: 'Ausentes', value: String(payload.attendance.absent) },
        { label: 'Tardes', value: String(payload.attendance.late) },
        { label: 'Excusadas', value: String(payload.attendance.excused) },
      ],
      observadorLines: [
        { label: 'Seguimientos abiertos', value: String(payload.observador.open) },
        { label: 'Seguimientos resueltos', value: String(payload.observador.resolved) },
      ],
      footnotes: [
        'El promedio simple es un consolidado descriptivo de las calificaciones registradas y no constituye una nota institucional.',
        'El observador solo incluye seguimientos cuyo nivel de confidencialidad permite ver el solicitante.',
      ],
    };

    const buffer = await buildReportPdf(pdfPayload);
    return {
      buffer,
      filename: `${slug}-${studentId}.pdf`,
      contentType: 'application/pdf',
    };
  }

  private buildObservadorSummary(
    followUps: Array<{ status: FollowUpStatus; confidentiality: string }>,
  ): { total: number; open: number; resolved: number; byConfidentiality: Record<string, number> } {
    const byConfidentiality: Record<string, number> = {};
    let open = 0;
    let resolved = 0;
    for (const f of followUps) {
      byConfidentiality[f.confidentiality] = (byConfidentiality[f.confidentiality] ?? 0) + 1;
      if (OPEN_FOLLOW_UP_STATUSES.includes(f.status)) open += 1;
      if (RESOLVED_FOLLOW_UP_STATUSES.includes(f.status)) resolved += 1;
    }
    return {
      total: followUps.length,
      open,
      resolved,
      byConfidentiality,
    };
  }

  private buildAttendanceSummary(attendanceMap: Record<string, number>) {
    const present = attendanceMap[AttendanceStatus.PRESENT] ?? 0;
    const absent = attendanceMap[AttendanceStatus.ABSENT] ?? 0;
    const late = attendanceMap[AttendanceStatus.LATE] ?? 0;
    const excused = attendanceMap[AttendanceStatus.EXCUSED] ?? 0;
    return {
      total: present + absent + late + excused,
      present,
      absent,
      late,
      excused,
    };
  }

  private async loadStudentContext(
    institutionId: string,
    studentId: string,
    academicPeriodId: string | null,
  ): Promise<BaseContext & { studentFirstName: string; studentLastName: string; documentType: string; documentNumber: string; studentStatus: string }> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, institutionId },
      include: {
        enrollments: {
          where: {
            status: 'ACTIVE',
            ...(academicPeriodId ? { academicPeriodId } : {}),
          },
          include: {
            course: true,
            schoolGrade: true,
          },
          orderBy: { enrolledAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true, name: true, slug: true },
    });

    const enrollmentRow = student.enrollments[0];
    const enrollment = enrollmentRow
      ? {
          courseId: enrollmentRow.courseId,
          courseCode: enrollmentRow.course.code,
          courseName: enrollmentRow.course.name,
          schoolGradeId: enrollmentRow.schoolGradeId,
          schoolGradeName: enrollmentRow.schoolGrade.name,
          enrolledAt: enrollmentRow.enrolledAt.toISOString(),
        }
      : null;

    return {
      studentId,
      institution: institution ?? { id: institutionId, name: 'Institución', slug: '' },
      academicPeriod: await this.resolvePeriodDto(institutionId, academicPeriodId),
      enrollment,
      studentFirstName: student.firstName,
      studentLastName: student.lastName,
      documentType: student.documentType,
      documentNumber: student.documentNumber,
      studentStatus: student.status,
    };
  }

  private async resolvePeriod(
    institutionId: string,
    academicPeriodId: string | null,
  ) {
    if (!academicPeriodId) return null;
    const period = await this.prisma.academicPeriod.findFirst({
      where: { id: academicPeriodId, institutionId },
    });
    if (!period) {
      throw new NotFoundException('Academic period not found');
    }
    return period;
  }

  private async resolvePeriodDto(
    institutionId: string,
    academicPeriodId: string | null,
  ) {
    const period = await this.resolvePeriod(institutionId, academicPeriodId);
    if (!period) return null;
    return {
      id: period.id,
      name: period.name,
      code: period.code,
      status: period.status,
      startDate: this.toDateString(period.startDate),
      endDate: this.toDateString(period.endDate),
    };
  }

  private async assertStudentAccess(
    userId: string,
    institutionId: string,
    studentId: string,
    academicPeriodId: string | null,
  ): Promise<string> {
    const role = await this.authorizationService.getUserRole(userId, institutionId);
    if (!role) {
      throw new ForbiddenException('Insufficient permissions');
    }
    const access = await this.authorizationService.canAccessStudent(
      userId,
      institutionId,
      studentId,
      academicPeriodId,
      role,
    );
    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      throw new NotFoundException('Student not found');
    }
    return role;
  }

  private async assertCourseAccess(
    userId: string,
    institutionId: string,
    courseId: string,
    academicPeriodId: string | null,
  ): Promise<string> {
    const role = await this.authorizationService.getUserRole(userId, institutionId);
    if (!role) {
      throw new ForbiddenException('Insufficient permissions');
    }
    const access = await this.authorizationService.canAccessCourse(
      userId,
      institutionId,
      courseId,
      academicPeriodId,
      role,
    );
    if (!access.allowed) {
      if (access.reason === 'SUPER_ADMIN_NO_ACCESS') {
        throw new ForbiddenException('Access denied');
      }
      throw new NotFoundException('Course not found');
    }
    return role;
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}