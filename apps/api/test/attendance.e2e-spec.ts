import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('Attendance Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;

  let demoAdminToken: string;
  let demoTeacherToken: string;

  // demo institution fixtures
  let attStudentId: string;
  let attCourseId: string;
  let attPeriodId: string;
  let closedPeriodId: string;
  let attSubjectId: string;
  let attSchoolGradeId: string;
  let createdAttendanceId: string;

  // second tenant fixtures + tokens
  let secAdminToken: string;
  let secParentToken: string;
  let secStudentToken: string;
  let secStudentId: string;
  let secOwnedStudentId: string;
  let secCourseId: string;
  let secPeriodId: string;
  let secOwnAttId: string;
  let secOtherAttId: string;

  const ATTEND_DATE = '2026-04-05';

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const demoInstitution = await prisma.institution.findUnique({
      where: { slug: 'demo-school' },
    });
    demoInstitutionId = demoInstitution!.id;

    // ---- demo institution fixtures ----
    const teacherUser = await prisma.user.findUnique({
      where: { email: 'teacher@demo-school.dev' },
    });
    const attStudent = await prisma.student.create({
      data: {
        institutionId: demoInstitutionId,
        firstName: 'Attendance',
        lastName: 'Test',
        documentType: 'DNI',
        documentNumber: 'AT' + Date.now().toString().slice(-8),
        status: 'ACTIVE',
      },
    });
    attStudentId = attStudent.id;
    const attCourse = await prisma.course.create({
      data: {
        institutionId: demoInstitutionId,
        code: 'AC' + Date.now().toString().slice(-6),
        name: 'E2E Attendance Course',
        status: 'ACTIVE',
      },
    });
    attCourseId = attCourse.id;
    const attSubject = await prisma.subject.create({
      data: {
        institutionId: demoInstitutionId,
        code: 'AS' + Date.now().toString().slice(-6),
        name: 'E2E Attendance Subject',
        status: 'ACTIVE',
      },
    });
    attSubjectId = attSubject.id;
    const attSchoolGrade = await prisma.schoolGrade.create({
      data: {
        institutionId: demoInstitutionId,
        name: 'E2E Attendance Grade',
        code: 'AG' + Date.now().toString().slice(-6),
      },
    });
    attSchoolGradeId = attSchoolGrade.id;
    const attPeriod = await prisma.academicPeriod.create({
      data: {
        institutionId: demoInstitutionId,
        name: 'E2E Attendance Period',
        code: 'APD' + Date.now().toString().slice(-6),
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-06-30'),
        status: 'ACTIVE',
      },
    });
    attPeriodId = attPeriod.id;
    const closedPeriod = await prisma.academicPeriod.create({
      data: {
        institutionId: demoInstitutionId,
        name: 'E2E Closed Period',
        code: 'ACP' + Date.now().toString().slice(-6),
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-12-31'),
        status: 'CLOSED',
      },
    });
    closedPeriodId = closedPeriod.id;

    await prisma.enrollment.create({
      data: {
        institutionId: demoInstitutionId,
        studentId: attStudentId,
        courseId: attCourseId,
        schoolGradeId: attSchoolGrade.id,
        academicPeriodId: attPeriodId,
        status: 'ACTIVE',
      },
    });
    await prisma.teacherAssignment.create({
      data: {
        institutionId: demoInstitutionId,
        teacherUserId: teacherUser!.id,
        courseId: attCourseId,
        subjectId: attSubject.id,
        academicPeriodId: attPeriodId,
        status: 'ACTIVE',
      },
    });

    // ---- second tenant fixtures (deterministic role scoping) ----
    const secondInstitution = await prisma.institution.create({
      data: { name: 'Second School ATT', slug: 'second-schoolatt-e2e', status: 'ACTIVE' },
    });
    secondInstitutionId = secondInstitution.id;

    const secAdminRole = await prisma.role.create({
      data: { name: 'INSTITUTION_ADMIN', roleType: 'TENANT', institutionId: secondInstitutionId },
    });
    const secTeacherRole = await prisma.role.create({
      data: { name: 'TEACHER', roleType: 'TENANT', institutionId: secondInstitutionId },
    });
    const secStudentRole = await prisma.role.create({
      data: { name: 'STUDENT', roleType: 'TENANT', institutionId: secondInstitutionId },
    });
    const secParentRole = await prisma.role.create({
      data: { name: 'PARENT', roleType: 'TENANT', institutionId: secondInstitutionId },
    });
    const allPermissions = await prisma.permission.findMany();
    for (const perm of allPermissions) {
      await prisma.rolePermission.create({
        data: { roleId: secAdminRole.id, permissionId: perm.id },
      });
    }
    const attPerms = await prisma.permission.findMany({
      where: { code: { startsWith: 'attendance:' } },
    });
    for (const perm of attPerms) {
      if (['attendance:read', 'attendance:create', 'attendance:update'].includes(perm.code)) {
        await prisma.rolePermission.create({
          data: { roleId: secTeacherRole.id, permissionId: perm.id },
        });
      }
      if (['attendance:read'].includes(perm.code)) {
        await prisma.rolePermission.create({
          data: { roleId: secParentRole.id, permissionId: perm.id },
        });
        await prisma.rolePermission.create({
          data: { roleId: secStudentRole.id, permissionId: perm.id },
        });
      }
    }

    const mkUser = async (email: string, roleId: string) => {
      const u = await prisma.user.create({
        data: {
          email,
          passwordHash: VALID_PASSWORD_HASH,
          firstName: 'Second',
          lastName: email.split('@')[0],
          status: 'ACTIVE',
        },
      });
      const mem = await prisma.userInstitution.create({
        data: { userId: u.id, institutionId: secondInstitutionId, status: MembershipStatus.ACTIVE },
      });
      await prisma.userRole.create({
        data: { userInstitutionId: mem.id, roleId, institutionId: secondInstitutionId },
      });
      return u;
    };
    const secAdmin = await mkUser('admin@second-schoolatt-e2e.dev', secAdminRole.id);
    const secTeacher = await mkUser('teacher@second-schoolatt-e2e.dev', secTeacherRole.id);
    const secParent = await mkUser('parent@second-schoolatt-e2e.dev', secParentRole.id);
    const secStudentUser = await mkUser('student@second-schoolatt-e2e.dev', secStudentRole.id);

    const secStudent = await prisma.student.create({
      data: {
        institutionId: secondInstitutionId,
        userId: secStudentUser.id,
        firstName: 'Enrolled',
        lastName: 'Student',
        documentType: 'DNI',
        documentNumber: 'SS' + Date.now().toString().slice(-8),
        status: 'ACTIVE',
      },
    });
    secStudentId = secStudent.id;
    const secOtherStudent = await prisma.student.create({
      data: {
        institutionId: secondInstitutionId,
        firstName: 'Other',
        lastName: 'Student',
        documentType: 'DNI',
        documentNumber: 'SO' + Date.now().toString().slice(-8),
        status: 'ACTIVE',
      },
    });
    secOwnedStudentId = secOtherStudent.id;
    await prisma.guardianStudent.create({
      data: {
        institutionId: secondInstitutionId,
        guardianUserId: secParent.id,
        studentId: secStudentId,
        relationshipType: 'FATHER',
        isPrimary: true,
        status: 'ACTIVE',
      },
    });
    await prisma.guardianStudent.create({
      data: {
        institutionId: secondInstitutionId,
        guardianUserId: secParent.id,
        studentId: secOwnedStudentId,
        relationshipType: 'OTHER',
        isPrimary: false,
        status: 'ACTIVE',
      },
    });

    const secCourse = await prisma.course.create({
      data: {
        institutionId: secondInstitutionId,
        code: 'SC' + Date.now().toString().slice(-6),
        name: 'Second Attendance Course',
        status: 'ACTIVE',
      },
    });
    secCourseId = secCourse.id;
    const secSubject = await prisma.subject.create({
      data: {
        institutionId: secondInstitutionId,
        code: 'SSU' + Date.now().toString().slice(-6),
        name: 'Second Attendance Subject',
        status: 'ACTIVE',
      },
    });
    const secSchoolGrade = await prisma.schoolGrade.create({
      data: {
        institutionId: secondInstitutionId,
        name: 'Second Attendance Grade',
        code: 'SSG' + Date.now().toString().slice(-6),
      },
    });
    const secPeriod = await prisma.academicPeriod.create({
      data: {
        institutionId: secondInstitutionId,
        name: 'Second Attendance Period',
        code: 'SPD' + Date.now().toString().slice(-6),
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-06-30'),
        status: 'ACTIVE',
      },
    });
    secPeriodId = secPeriod.id;
    await prisma.enrollment.create({
      data: {
        institutionId: secondInstitutionId,
        studentId: secStudentId,
        courseId: secCourseId,
        schoolGradeId: secSchoolGrade.id,
        academicPeriodId: secPeriodId,
        status: 'ACTIVE',
      },
    });
    await prisma.teacherAssignment.create({
      data: {
        institutionId: secondInstitutionId,
        teacherUserId: secTeacher.id,
        courseId: secCourseId,
        subjectId: secSubject.id,
        academicPeriodId: secPeriodId,
        status: 'ACTIVE',
      },
    });

    const secOwnAtt = await prisma.attendance.create({
      data: {
        institutionId: secondInstitutionId,
        studentId: secStudentId,
        courseId: secCourseId,
        academicPeriodId: secPeriodId,
        date: new Date('2026-04-05'),
        status: 'PRESENT',
        recordedById: secAdmin.id,
      },
    });
    secOwnAttId = secOwnAtt.id;
    const secOtherAtt = await prisma.attendance.create({
      data: {
        institutionId: secondInstitutionId,
        studentId: secOwnedStudentId,
        courseId: secCourseId,
        academicPeriodId: secPeriodId,
        date: new Date('2026-04-05'),
        status: 'ABSENT',
        recordedById: secAdmin.id,
      },
    });
    secOtherAttId = secOtherAtt.id;

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Demo1234!' });
      return res.body.accessToken;
    };
    demoAdminToken = await login('admin@demo-school.dev');
    demoTeacherToken = await login('teacher@demo-school.dev');
    secAdminToken = await login('admin@second-schoolatt-e2e.dev');
    secParentToken = await login('parent@second-schoolatt-e2e.dev');
    secStudentToken = await login('student@second-schoolatt-e2e.dev');
  }, 60000);

  afterAll(async () => {
    await prisma.attendance.deleteMany({
      where: { institutionId: demoInstitutionId, courseId: attCourseId },
    });
    await prisma.teacherAssignment.deleteMany({ where: { courseId: attCourseId } });
    await prisma.enrollment.deleteMany({ where: { studentId: attStudentId } });
    await prisma.course.delete({ where: { id: attCourseId } }).catch(() => {});
    await prisma.academicPeriod.delete({ where: { id: attPeriodId } }).catch(() => {});
    await prisma.academicPeriod.delete({ where: { id: closedPeriodId } }).catch(() => {});
    await prisma.subject.delete({ where: { id: attSubjectId } }).catch(() => {});
    await prisma.schoolGrade.delete({ where: { id: attSchoolGradeId } }).catch(() => {});
    await prisma.student.delete({ where: { id: attStudentId } }).catch(() => {});

    await prisma.attendance.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.teacherAssignment.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.enrollment.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.guardianStudent.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.userRole.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.rolePermission.deleteMany({
      where: { role: { institutionId: secondInstitutionId } },
    });
    await prisma.attendance.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.userInstitution.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.role.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.subject.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.schoolGrade.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.course.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.academicPeriod.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.student.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.institution.delete({ where: { id: secondInstitutionId } });
    for (const email of [
      'admin@second-schoolatt-e2e.dev',
      'teacher@second-schoolatt-e2e.dev',
      'parent@second-schoolatt-e2e.dev',
      'student@second-schoolatt-e2e.dev',
    ]) {
      await prisma.user.delete({ where: { email } }).catch(() => {});
    }
    await app.close();
    await prisma.$disconnect();
  });

  describe('Authentication', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/attendance')
        .set('X-Institution-Id', demoInstitutionId)
        .expect(401);
    });
  });

  describe('POST /api/v1/attendance', () => {
    it('should create attendance as admin (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: attStudentId,
          courseId: attCourseId,
          academicPeriodId: attPeriodId,
          date: ATTEND_DATE,
          status: 'PRESENT',
          notes: null,
        })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.institutionId).toBe(demoInstitutionId);
      expect(res.body.studentId).toBe(attStudentId);
      createdAttendanceId = res.body.id;
    });

    it('should create attendance as teacher assigned to the course (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${demoTeacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: attStudentId,
          courseId: attCourseId,
          academicPeriodId: attPeriodId,
          date: '2026-04-06',
          status: 'ABSENT',
          notes: 'Inasistencia',
        })
        .expect(201);
      expect(res.body.status).toBe('ABSENT');
    });

    it('should reject duplicate attendance (same student/course/date) with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: attStudentId,
          courseId: attCourseId,
          academicPeriodId: attPeriodId,
          date: ATTEND_DATE,
          status: 'LATE',
          notes: null,
        })
        .expect(400);
    });

    it('should return 403 for parent/student who lack attendance:create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${secParentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .send({
          studentId: secStudentId,
          courseId: secCourseId,
          academicPeriodId: secPeriodId,
          date: ATTEND_DATE,
          status: 'PRESENT',
          notes: null,
        })
        .expect(403);
      await request(app.getHttpServer())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${secStudentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .send({
          studentId: secStudentId,
          courseId: secCourseId,
          academicPeriodId: secPeriodId,
          date: ATTEND_DATE,
          status: 'PRESENT',
          notes: null,
        })
        .expect(403);
    });

    it('should reject body tampering (institutionId) with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: attStudentId,
          courseId: attCourseId,
          academicPeriodId: attPeriodId,
          date: ATTEND_DATE,
          status: 'PRESENT',
          institutionId: secondInstitutionId,
        })
        .expect(400);
    });

    it('should reject body tampering (recordedById) with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: attStudentId,
          courseId: attCourseId,
          academicPeriodId: attPeriodId,
          date: ATTEND_DATE,
          status: 'PRESENT',
          recordedById: '00000000-0000-0000-0000-000000000000',
        })
        .expect(400);
    });

    it('should reject missing required fields with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({})
        .expect(400);
    });

    it('should return 400 when academic period is CLOSED', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: attStudentId,
          courseId: attCourseId,
          academicPeriodId: closedPeriodId,
          date: '2026-08-01',
          status: 'PRESENT',
          notes: null,
        })
        .expect(400);
    });

    it('should return 404 for a teacher on an unassigned course (cross-scope)', async () => {
      const unassignedCourse = await prisma.course.create({
        data: {
          institutionId: demoInstitutionId,
          code: 'UN' + Date.now().toString().slice(-6),
          name: 'Unassigned Course',
          status: 'ACTIVE',
        },
      });
      await request(app.getHttpServer())
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${demoTeacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: attStudentId,
          courseId: unassignedCourse.id,
          academicPeriodId: attPeriodId,
          date: '2026-04-07',
          status: 'PRESENT',
          notes: null,
        })
        .expect(404);
      await prisma.course.delete({ where: { id: unassignedCourse.id } });
    });
  });

  describe('POST /api/v1/attendance/bulk', () => {
    it('should bulk create attendance for a teacher (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/bulk')
        .set('Authorization', `Bearer ${demoTeacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          courseId: attCourseId,
          academicPeriodId: attPeriodId,
          date: '2026-04-08',
          records: [{ studentId: attStudentId, status: 'PRESENT', notes: null }],
        })
        .expect(201);
      expect(res.body.created).toBe(1);
    });

    it('should be idempotent (skip duplicates) on second call', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/attendance/bulk')
        .set('Authorization', `Bearer ${demoTeacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          courseId: attCourseId,
          academicPeriodId: attPeriodId,
          date: '2026-04-08',
          records: [{ studentId: attStudentId, status: 'ABSENT', notes: null }],
        })
        .expect(201);
      expect(res.body.created).toBe(0);
      expect(res.body.skipped).toBe(1);
    });

    it('should return 400 when academic period is CLOSED', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/attendance/bulk')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          courseId: attCourseId,
          academicPeriodId: closedPeriodId,
          date: '2026-08-01',
          records: [{ studentId: attStudentId, status: 'PRESENT', notes: null }],
        })
        .expect(400);
    });

    it('should reject empty records with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/attendance/bulk')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          courseId: attCourseId,
          academicPeriodId: attPeriodId,
          date: ATTEND_DATE,
          records: [],
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/attendance', () => {
    it('should return paginated list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/attendance')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const a of res.body.data) expect(a.institutionId).toBe(demoInstitutionId);
    });

    it('should filter by course and student', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/attendance?courseId=${attCourseId}&studentId=${attStudentId}`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      for (const a of res.body.data) {
        expect(a.courseId).toBe(attCourseId);
        expect(a.studentId).toBe(attStudentId);
      }
    });

    it('should return correct pagination meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/attendance?page=1&limit=1')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(1);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('totalPages');
    });

    it('should only show own records for a STUDENT (scoped)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/attendance')
        .set('Authorization', `Bearer ${secStudentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);
      for (const a of res.body.data) expect(a.studentId).toBe(secStudentId);
    });

    it('should only show linked children records for a PARENT (scoped)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/attendance')
        .set('Authorization', `Bearer ${secParentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);
      for (const a of res.body.data) {
        expect([secStudentId, secOwnedStudentId]).toContain(a.studentId);
      }
    });
  });

  describe('GET /api/v1/attendance/:id', () => {
    it('should return attendance by id for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/attendance/${createdAttendanceId}`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.id).toBe(createdAttendanceId);
    });

    it('should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/attendance/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });

    it('should return 404 for cross-tenant resource access', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/attendance/${createdAttendanceId}`)
        .set('Authorization', `Bearer ${secAdminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(404);
    });

    it('should return 404 for a STUDENT reading another student record (IDOR)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/attendance/${secOtherAttId}`)
        .set('Authorization', `Bearer ${secStudentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(404);
    });

    it('should allow a STUDENT to read their own record', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/attendance/${secOwnAttId}`)
        .set('Authorization', `Bearer ${secStudentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);
    });

    it('should allow a PARENT to read a linked child record', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/attendance/${secOwnAttId}`)
        .set('Authorization', `Bearer ${secParentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);
    });
  });

  describe('PATCH /api/v1/attendance/:id', () => {
    it('should update status and notes as admin (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/attendance/${createdAttendanceId}`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ status: 'EXCUSED', notes: 'Justificado' })
        .expect(200);
      expect(res.body.status).toBe('EXCUSED');
      expect(res.body.notes).toBe('Justificado');
    });

    it('should preserve immutable fields on update', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/attendance/${createdAttendanceId}`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ status: 'LATE' })
        .expect(200);
      expect(res.body.studentId).toBe(attStudentId);
      expect(res.body.courseId).toBe(attCourseId);
      expect(res.body.academicPeriodId).toBe(attPeriodId);
      expect(res.body.status).toBe('LATE');
    });

    it('should reject immutable field tampering (studentId) with 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/attendance/${createdAttendanceId}`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ studentId: '00000000-0000-0000-0000-000000000000' })
        .expect(400);
    });

    it('should return 403 for PARENT and STUDENT (no attendance:update)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/attendance/${secOwnAttId}`)
        .set('Authorization', `Bearer ${secParentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .send({ status: 'ABSENT' })
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/api/v1/attendance/${secOwnAttId}`)
        .set('Authorization', `Bearer ${secStudentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .send({ status: 'ABSENT' })
        .expect(403);
    });

    it('should return 400 in CLOSED period', async () => {
      const closedAtt = await prisma.attendance.create({
        data: {
          institutionId: demoInstitutionId,
          studentId: attStudentId,
          courseId: attCourseId,
          academicPeriodId: closedPeriodId,
          date: new Date('2026-08-01'),
          status: 'PRESENT',
          recordedById: await (async () =>
            (await prisma.user.findUnique({ where: { email: 'admin@demo-school.dev' } }))!.id)(),
        },
      });
      await request(app.getHttpServer())
        .patch(`/api/v1/attendance/${closedAtt.id}`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ status: 'ABSENT' })
        .expect(400);
      await prisma.attendance.delete({ where: { id: closedAtt.id } });
    });
  });

  describe('DELETE /api/v1/attendance/:id', () => {
    it('should delete attendance as admin (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/attendance/${createdAttendanceId}`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/attendance/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });

    it('should return 403 for TEACHER (no attendance:delete)', async () => {
      const teacherAtt = await prisma.attendance.create({
        data: {
          institutionId: demoInstitutionId,
          studentId: attStudentId,
          courseId: attCourseId,
          academicPeriodId: attPeriodId,
          date: new Date('2026-04-09'),
          status: 'LATE',
          recordedById: (await prisma.user.findUnique({
            where: { email: 'admin@demo-school.dev' },
          }))!.id,
        },
      });
      await request(app.getHttpServer())
        .delete(`/api/v1/attendance/${teacherAtt.id}`)
        .set('Authorization', `Bearer ${demoTeacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(403);
    });
  });
});
