import { ReportsService } from './reports.service';
import { FollowUpStatus, AttendanceStatus } from '@prisma/client';

jest.mock('./report-pdf', () => ({
  buildReportPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake')),
}));

describe('ReportsService', () => {
  let service: ReportsService;
  let prismaMock: Record<string, { findMany?: jest.Mock; findFirst?: jest.Mock; findUnique?: jest.Mock; groupBy?: jest.Mock; create?: jest.Mock }>;
  let auditMock: { log: jest.Mock };
  let authorizationMock: {
    getUserRole: jest.Mock;
    canAccessStudent: jest.Mock;
    canAccessCourse: jest.Mock;
  };
  let followUpAuthorizationMock: {
    getVisibleConfidentialityLevels: jest.Mock;
  };

  const institutionId = 'inst-1';
  const userId = 'user-1';
  const studentId = 'student-1';
  const courseId = 'course-1';
  const periodId = 'period-1';

  const studentFixture = {
    id: studentId,
    firstName: 'María',
    lastName: 'González',
    documentType: 'DNI',
    documentNumber: '12345678',
    status: 'ACTIVE',
    enrollments: [
      {
        courseId,
        course: { code: 'C1', name: 'Matemáticas 2024' },
        schoolGradeId: 'sg-1',
        schoolGrade: { name: 'Primero A' },
        enrolledAt: new Date('2024-03-01'),
      },
    ],
  };

  const gradesFixture = [
    {
      id: 'g1',
      studentId,
      subjectId: 's1',
      subject: { id: 's1', code: 'MAT', name: 'Matemáticas' },
      value: 4,
      period: '2024-1',
      evaluationType: 'PARCIAL',
      description: 'Examen parcial',
      status: 'ACTIVE',
      updatedAt: new Date('2024-06-01'),
    },
    {
      id: 'g2',
      studentId,
      subjectId: 's1',
      subject: { id: 's1', code: 'MAT', name: 'Matemáticas' },
      value: 5,
      period: '2024-1',
      evaluationType: 'PARCIAL',
      description: 'Examen parcial 2',
      status: 'ACTIVE',
      updatedAt: new Date('2024-06-02'),
    },
  ];

  const attendanceFixture = [
    { status: AttendanceStatus.PRESENT, _count: { _all: 20 } },
    { status: AttendanceStatus.ABSENT, _count: { _all: 2 } },
    { status: AttendanceStatus.LATE, _count: { _all: 1 } },
  ];

  const periodFixture = {
    id: periodId,
    name: 'Período 1',
    code: '2024-1',
    status: 'ACTIVE',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-07-31'),
  };

  beforeEach(() => {
    prismaMock = {
      student: { findFirst: jest.fn() },
      institution: { findUnique: jest.fn() },
      grade: { findMany: jest.fn() },
      attendance: { groupBy: jest.fn() },
      teacherAssignment: { findMany: jest.fn() },
      studentFollowUp: { findMany: jest.fn() },
      academicPeriod: { findFirst: jest.fn() },
      course: { findFirst: jest.fn() },
      enrollment: { findMany: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    auditMock = { log: jest.fn().mockResolvedValue(undefined) };
    authorizationMock = {
      getUserRole: jest.fn().mockResolvedValue('TEACHER'),
      canAccessStudent: jest.fn().mockResolvedValue({ allowed: true }),
      canAccessCourse: jest.fn().mockResolvedValue({ allowed: true }),
    };
    followUpAuthorizationMock = {
      getVisibleConfidentialityLevels: jest.fn().mockReturnValue([
        'PUBLIC',
        'INTERNAL',
      ]),
    };

    service = new ReportsService(
      prismaMock as never,
      auditMock as never,
      authorizationMock as never,
      followUpAuthorizationMock as never,
    );
  });

  describe('getStudentReport', () => {
    beforeEach(() => {
      prismaMock.student.findFirst!.mockResolvedValue(studentFixture);
      prismaMock.institution.findUnique!.mockResolvedValue({
        id: institutionId,
        name: 'Colegio Demo',
        slug: 'demo',
      });
      prismaMock.academicPeriod.findFirst!.mockResolvedValue(periodFixture);
      prismaMock.grade.findMany!.mockResolvedValue(gradesFixture);
      prismaMock.attendance.groupBy!.mockResolvedValue(attendanceFixture);
      prismaMock.teacherAssignment.findMany!.mockResolvedValue([
        {
          subject: { id: 's1' },
          teacherUser: { id: 'u-teacher', firstName: 'Juan', lastName: 'Pérez' },
        },
      ]);
      prismaMock.studentFollowUp.findMany!.mockResolvedValue([
        { status: FollowUpStatus.OPEN, confidentiality: 'PUBLIC' },
        { status: FollowUpStatus.RESOLVED, confidentiality: 'INTERNAL' },
        { status: FollowUpStatus.OPEN, confidentiality: 'SENSITIVE' },
      ]);
    });

    it('should consolidate academics with subject grades and descriptive average', async () => {
      const report = await service.getStudentReport(userId, institutionId, studentId, periodId);

      expect(report.student.firstName).toBe('María');
      expect(report.institution.name).toBe('Colegio Demo');
      expect(report.enrollment?.courseName).toBe('Matemáticas 2024');
      expect(report.academic).toHaveLength(1);
      expect(report.academic[0].grades).toHaveLength(2);
      expect(report.academic[0].simpleAverage).toBe(4.5);
      expect(report.academic[0].teacher?.firstName).toBe('Juan');
    });

    it('should include teacher assignments when includeTeacher is true', async () => {
      const report = await service.getStudentReport(userId, institutionId, studentId, periodId);
      expect(report.academic[0].teacher).toEqual({
        id: 'u-teacher',
        firstName: 'Juan',
        lastName: 'Pérez',
      });
    });

    it('should aggregate attendance counts', async () => {
      const report = await service.getStudentReport(userId, institutionId, studentId, periodId);
      expect(report.attendance).toEqual({
        total: 23,
        present: 20,
        absent: 2,
        late: 1,
        excused: 0,
      });
    });

    it('should forward the actor confidentiality visibility levels to the follow-up filter', async () => {
      followUpAuthorizationMock.getVisibleConfidentialityLevels.mockReturnValue([
        'PUBLIC',
        'INTERNAL',
      ]);
      prismaMock.studentFollowUp.findMany!.mockResolvedValue([
        { status: FollowUpStatus.OPEN, confidentiality: 'PUBLIC' },
        { status: FollowUpStatus.RESOLVED, confidentiality: 'INTERNAL' },
        { status: FollowUpStatus.OPEN, confidentiality: 'SENSITIVE' },
      ]);
      await service.getStudentReport(userId, institutionId, studentId, periodId);
      const callWhere = prismaMock.studentFollowUp.findMany!.mock.calls[0][0] as {
        where: { confidentiality: { in: string[] } };
      };
      expect(callWhere.where.confidentiality).toEqual({ in: ['PUBLIC', 'INTERNAL'] });
    });

    it('should summarize observador counts from visible follow-ups only', async () => {
      prismaMock.studentFollowUp.findMany!.mockResolvedValue([
        { status: FollowUpStatus.OPEN, confidentiality: 'PUBLIC' },
        { status: FollowUpStatus.RESOLVED, confidentiality: 'INTERNAL' },
        { status: FollowUpStatus.IN_PROGRESS, confidentiality: 'PUBLIC' },
      ]);
      const report = await service.getStudentReport(userId, institutionId, studentId, periodId);
      expect(report.observador.total).toBe(3);
      expect(report.observador.open).toBe(2);
      expect(report.observador.resolved).toBe(1);
      expect(report.observador.byConfidentiality).toEqual({
        PUBLIC: 2,
        INTERNAL: 1,
      });
    });
  });

  describe('getStudentBulletin', () => {
    beforeEach(() => {
      prismaMock.student.findFirst!.mockResolvedValue(studentFixture);
      prismaMock.institution.findUnique!.mockResolvedValue({
        id: institutionId,
        name: 'Colegio Demo',
        slug: 'demo',
      });
      prismaMock.academicPeriod.findFirst!.mockResolvedValue(periodFixture);
      prismaMock.grade.findMany!.mockResolvedValue(gradesFixture);
      prismaMock.attendance.groupBy!.mockResolvedValue(attendanceFixture);
      prismaMock.teacherAssignment.findMany!.mockResolvedValue([]);
      prismaMock.studentFollowUp.findMany!.mockResolvedValue([]);
    });

    it('should not include teacher info in the bulletin', async () => {
      const bulletin = await service.getStudentBulletin(userId, institutionId, studentId, periodId);
      expect(bulletin.academic[0].teacher).toBeNull();
    });

    it('should not query teacher assignments on bulletins', async () => {
      prismaMock.teacherAssignment.findMany!.mockResolvedValue([]);
      await service.getStudentBulletin(userId, institutionId, studentId, periodId);
      expect(prismaMock.teacherAssignment.findMany).not.toHaveBeenCalled();
    });
  });

  describe('resource denial', () => {
    it('should throw NotFoundException when student is not in the tenant', async () => {
      prismaMock.student.findFirst!.mockResolvedValue(null);
      await expect(
        service.getStudentReport(userId, institutionId, studentId, periodId),
      ).rejects.toThrow('Student not found');
    });

    it('should throw NotFoundException when the user has no relationship (402-less)', async () => {
      prismaMock.student.findFirst!.mockResolvedValue(studentFixture);
      authorizationMock.canAccessStudent.mockResolvedValue({
        allowed: false,
        reason: 'NO_STUDENT_RELATIONSHIP',
      });
      await expect(
        service.getStudentReport(userId, institutionId, studentId, periodId),
      ).rejects.toThrow('Student not found');
    });

    it('should throw NotFoundException for an academic period outside the tenant', async () => {
      prismaMock.student.findFirst!.mockResolvedValue(studentFixture);
      prismaMock.academicPeriod.findFirst!.mockResolvedValue(null);
      await expect(
        service.getStudentReport(userId, institutionId, studentId, periodId),
      ).rejects.toThrow('Academic period not found');
    });
  });

  describe('exports', () => {
    beforeEach(() => {
      prismaMock.student.findFirst!.mockResolvedValue(studentFixture);
      prismaMock.institution.findUnique!.mockResolvedValue({
        id: institutionId,
        name: 'Colegio Demo',
        slug: 'demo',
      });
      prismaMock.academicPeriod.findFirst!.mockResolvedValue(periodFixture);
      prismaMock.grade.findMany!.mockResolvedValue(gradesFixture);
      prismaMock.attendance.groupBy!.mockResolvedValue(attendanceFixture);
      prismaMock.teacherAssignment.findMany!.mockResolvedValue([]);
      prismaMock.studentFollowUp.findMany!.mockResolvedValue([]);
    });

    it('should export a PDF student report and audit REPORT_EXPORTED', async () => {
      const result = await service.exportStudentReport(userId, institutionId, studentId, periodId, 'pdf', '127.0.0.1');
      expect(result.contentType).toBe('application/pdf');
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.filename).toContain('reporte-individual');
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REPORT_EXPORTED',
          entityType: 'Report',
          entityId: studentId,
          ipAddress: '127.0.0.1',
        }),
      );
    });

    it('should export a CSV student bulletin and audit BULLETIN_EXPORTED', async () => {
      const result = await service.exportStudentBulletin(userId, institutionId, studentId, periodId, 'csv', '127.0.0.1');
      expect(result.contentType).toContain('text/csv');
      expect(result.buffer.toString('utf8')).toContain('Asignatura');
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'BULLETIN_EXPORTED', entityType: 'Bulletin' }),
      );
    });
  });

  describe('getCourseReport', () => {
    const enrollmentsFixture = [
      {
        studentId: 'student-1',
        student: {
          id: 'student-1',
          firstName: 'María',
          lastName: 'González',
          documentType: 'DNI',
          documentNumber: '12345678',
          status: 'ACTIVE',
        },
        schoolGrade: { name: 'Primero A' },
        enrolledAt: new Date('2024-03-01'),
      },
      {
        studentId: 'student-2',
        student: {
          id: 'student-2',
          firstName: 'Pedro',
          lastName: 'Sánchez',
          documentType: 'DNI',
          documentNumber: '87654321',
          status: 'ACTIVE',
        },
        schoolGrade: { name: 'Primero A' },
        enrolledAt: new Date('2024-03-02'),
      },
    ];

    beforeEach(() => {
      prismaMock.course.findFirst!.mockResolvedValue({
        id: courseId,
        code: 'C1',
        name: 'Matemáticas 2024',
        status: 'ACTIVE',
        description: null,
      });
      prismaMock.academicPeriod.findFirst!.mockResolvedValue(periodFixture);
      prismaMock.enrollment.findMany!.mockResolvedValue(enrollmentsFixture);
prismaMock.grade.findMany!.mockResolvedValue([
      { studentId: 'student-1', subjectId: 's1', value: 4 },
      { studentId: 'student-1', subjectId: 's1', value: 5 },
      { studentId: 'student-2', subjectId: 's1', value: 3 },
    ]);
      prismaMock.attendance.groupBy!.mockResolvedValue([
        { studentId: 'student-1', status: AttendanceStatus.PRESENT, _count: { _all: 10 } },
        { studentId: 'student-2', status: AttendanceStatus.PRESENT, _count: { _all: 8 } },
      ]);
    });

    it('should build per-student rows with descriptive averages and attendance', async () => {
      const report = await service.getCourseReport(userId, institutionId, courseId, periodId);
      expect(report.students).toHaveLength(2);
      expect(report.students[0].simpleAverage).toBe(4.5);
      expect(report.students[0].subjectCount).toBe(1);
      expect(report.students[0].attendance.present).toBe(10);
      expect(report.students[1].simpleAverage).toBe(3);
      expect(report.summary).toEqual({
        totalStudents: 2,
        studentsWithGrades: 2,
        studentsWithAttendance: 2,
      });
    });

    it('should export a CSV course report and audit the export', async () => {
      const result = await service.exportCourseReportCsv(userId, institutionId, courseId, periodId, '127.0.0.1');
      const text = result.buffer.toString('utf8');
      expect(text).toContain('Estudiante');
      expect(text).toContain('González, María');
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REPORT_EXPORTED',
          entityType: 'Report',
          entityId: courseId,
          ipAddress: '127.0.0.1',
        }),
      );
    });
  });
});