import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

async function createSecondInstitution(prisma: PrismaClient, suffix: string) {
  const institution = await prisma.institution.create({
    data: {
      name: `Second School ${suffix}`,
      slug: `second-school-${suffix}`,
      status: 'ACTIVE',
    },
  });
  const role = await prisma.role.create({
    data: { name: 'INSTITUTION_ADMIN', roleType: 'TENANT', institutionId: institution.id },
  });
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
  }
  const admin = await prisma.user.create({
    data: {
      email: `admin@${suffix}.dev`,
      passwordHash: VALID_PASSWORD_HASH,
      firstName: 'Second',
      lastName: 'Admin',
      status: 'ACTIVE',
    },
  });
  const membership = await prisma.userInstitution.create({
    data: { userId: admin.id, institutionId: institution.id, status: MembershipStatus.ACTIVE },
  });
  await prisma.userRole.create({
    data: { userInstitutionId: membership.id, roleId: role.id, institutionId: institution.id },
  });
  return { institution, admin };
}

async function cleanupSecondInstitution(prisma: PrismaClient, institutionId: string) {
  await prisma.rolePermission.deleteMany({ where: { role: { institutionId } } }).catch(() => {});
  await prisma.userRole.deleteMany({ where: { institutionId } }).catch(() => {});
  await prisma.userInstitution.deleteMany({ where: { institutionId } }).catch(() => {});
  await prisma.role.deleteMany({ where: { institutionId } }).catch(() => {});
  await prisma.institution.delete({ where: { id: institutionId } }).catch(() => {});
}

describe('Reports Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;

  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let studentToken: string;
  let secondAdminToken: string;

  let teacherCourseId: string;
  let teacherPeriodId: string;
  let teacherStudentId: string;
  let parentLinkedStudentId: string;
  let unrelatedStudentId: string | null;
  let unrelatedCourseId: string | null;
  let liveStudentId: string;
  let secondAdminUserId: string | null = null;

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

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Demo1234!' });
      return res.body.accessToken;
    };

    adminToken = await login('admin@demo-school.dev');
    teacherToken = await login('teacher@demo-school.dev');
    parentToken = await login('parent@demo-school.dev');
    studentToken = await login('student@demo-school.dev');

    // Teacher fixtures: ACTIVE assignment -> its period + course -> an enrolled student.
    // We pick the SECOND enrollment (skip:1) so that teacherStudentId != liveStudentId
    // (the seed links the first student to student@demo-school.dev).
    const teacherUser = await prisma.user.findUnique({
      where: { email: 'teacher@demo-school.dev' },
    });
    const assignment = await prisma.teacherAssignment.findFirst({
      where: { teacherUserId: teacherUser!.id, institutionId: demoInstitutionId, status: 'ACTIVE' },
    });
    if (assignment) {
      teacherCourseId = assignment.courseId;
      teacherPeriodId = assignment.academicPeriodId;
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          institutionId: demoInstitutionId,
          courseId: assignment.courseId,
          academicPeriodId: assignment.academicPeriodId,
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'asc' },
        skip: 1,
      });
      if (enrollment) {
        teacherStudentId = enrollment.studentId;
      } else {
        const fallback = await prisma.enrollment.findFirst({
          where: {
            institutionId: demoInstitutionId,
            courseId: assignment.courseId,
            academicPeriodId: assignment.academicPeriodId,
            status: 'ACTIVE',
          },
        });
        teacherStudentId = fallback!.studentId;
      }
    }

    // Parent fixtures: linked student + a real unrelated student (when one exists).
    const parentUser = await prisma.user.findUnique({
      where: { email: 'parent@demo-school.dev' },
    });
    const parentLink = await prisma.guardianStudent.findFirst({
      where: { guardianUserId: parentUser!.id, institutionId: demoInstitutionId },
      orderBy: { createdAt: 'asc' },
    });
    parentLinkedStudentId = parentLink!.studentId;

    const linkedIds: string[] = [];
    const links = await prisma.guardianStudent.findMany({
      where: { guardianUserId: parentUser!.id, institutionId: demoInstitutionId },
      select: { studentId: true },
    });
    for (const l of links) linkedIds.push(l.studentId);
    const allStudentIds = await prisma.student.findMany({
      where: { institutionId: demoInstitutionId },
      select: { id: true },
    });
    unrelatedStudentId =
      allStudentIds.find((s) => !linkedIds.includes(s.id) && s.id !== teacherStudentId)?.id ?? null;

    // Live student: a Student record owned by the STUDENT user login (reuse if seed already linked).
    const studentUser = await prisma.user.findUnique({
      where: { email: 'student@demo-school.dev' },
    });
    let liveStudent = await prisma.student.findFirst({
      where: { institutionId: demoInstitutionId, userId: studentUser!.id },
    });
    if (!liveStudent) {
      liveStudent = await prisma.student.create({
        data: {
          institutionId: demoInstitutionId,
          userId: studentUser!.id,
          firstName: 'Estudiante',
          lastName: 'Vivo',
          documentType: 'DNI',
          documentNumber: `9999${Date.now().toString().slice(-4)}`,
          status: 'ACTIVE',
        },
      });
    }
    liveStudentId = liveStudent.id;

    // Find a course the STUDENT user is NOT enrolled in (for the course IDOR test).
    const studentEnrollments = await prisma.enrollment.findMany({
      where: { institutionId: demoInstitutionId, studentId: liveStudentId, status: 'ACTIVE' },
      select: { courseId: true },
    });
    const enrolledCourseIds = new Set(studentEnrollments.map((e) => e.courseId));
    const allCourses = await prisma.course.findMany({
      where: { institutionId: demoInstitutionId },
      select: { id: true },
    });
    unrelatedCourseId = allCourses.find((c) => !enrolledCourseIds.has(c.id))?.id ?? null;

    // Cross-tenant institution.
    const second = await createSecondInstitution(prisma, 'rpt');
    secondInstitutionId = second.institution.id;
    secondAdminUserId = second.admin.id;
    const secondLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `admin@rpt.dev`, password: 'Demo1234!' });
    secondAdminToken = secondLogin.body.accessToken;
  }, 30000);

  afterAll(async () => {
    if (liveStudentId) {
      await prisma.student.delete({ where: { id: liveStudentId } }).catch(() => {});
    }
    await prisma.auditLog
      .deleteMany({
        where: {
          action: { in: ['REPORT_EXPORTED', 'BULLETIN_EXPORTED'] },
          OR: [{ entityId: teacherStudentId }, { entityId: teacherCourseId }],
        },
      })
      .catch(() => {});
    if (secondInstitutionId) {
      await cleanupSecondInstitution(prisma, secondInstitutionId);
    }
    if (secondAdminUserId) {
      await prisma.user.delete({ where: { id: secondAdminUserId } }).catch(() => {});
    }
    await app.close();
    await prisma.$disconnect();
  });

  describe('Authentication', () => {
    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/reports/students/${teacherStudentId}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(401);
    });
  });

  describe('RBAC (export permission)', () => {
    it('should deny export to PARENT (reports:read only)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/reports/students/${parentLinkedStudentId}/export`)
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(403);
      await request(app.getHttpServer())
        .get(`/api/v1/reports/students/${parentLinkedStudentId}/bulletin/export`)
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(403);
      await request(app.getHttpServer())
        .get(`/api/v1/reports/courses/${teacherCourseId}/export`)
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(403);
    });

    it('should allow TEACHER to export (reports:export)', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/reports/students/${teacherStudentId}/export?academicPeriodId=${teacherPeriodId}`,
        )
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body).toBeDefined();
    });
  });

  describe('GET /api/v1/reports/students/:studentId', () => {
    it('should return the individual report for the admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reports/students/${teacherStudentId}?academicPeriodId=${teacherPeriodId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.student.id).toBe(teacherStudentId);
      expect(res.body.institution.id).toBe(demoInstitutionId);
      expect(res.body.academicPeriod).not.toBeNull();
      expect(res.body.academic).toBeDefined();
      expect(res.body.attendance).toHaveProperty('total');
    });

    it('should allow a TEACHER for a student of an assigned course', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reports/students/${teacherStudentId}?academicPeriodId=${teacherPeriodId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.student.id).toBe(teacherStudentId);
    });

    it('should deny a TEACHER for a student outside their relationship (404)', async () => {
      if (!unrelatedStudentId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/reports/students/${unrelatedStudentId}?academicPeriodId=${teacherPeriodId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });

    it('should allow a PARENT for a linked child', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reports/students/${parentLinkedStudentId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.student.id).toBe(parentLinkedStudentId);
    });

    it('should deny a PARENT for an unlinked student (IDOR)', async () => {
      if (!unrelatedStudentId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/reports/students/${unrelatedStudentId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });

    it('should allow the STUDENT user for their own record', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reports/students/${liveStudentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.student.id).toBe(liveStudentId);
    });

    it('should deny the STUDENT user for another student (IDOR)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/reports/students/${teacherStudentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });

    it('should return 404 for a non-existent academic period', async () => {
      await request(app.getHttpServer())
        .get(
          `/api/v1/reports/students/${teacherStudentId}?academicPeriodId=00000000-0000-4000-8000-000000000000`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });

    it('should return 404 for a cross-tenant student (no data leak)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/reports/students/${teacherStudentId}`)
        .set('Authorization', `Bearer ${secondAdminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(404);
    });
  });

  describe('GET /api/v1/reports/students/:studentId/bulletin', () => {
    it('should return the bulletin for the admin', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/reports/students/${teacherStudentId}/bulletin?academicPeriodId=${teacherPeriodId}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.student.id).toBe(teacherStudentId);
    });

    it('should allow a PARENT for their child and hide nothing they may not see', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reports/students/${parentLinkedStudentId}/bulletin`)
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.observador).toHaveProperty('byConfidentiality');
    });
  });

  describe('GET /api/v1/reports/courses/:courseId', () => {
    it('should return the course report with per-student rows', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reports/courses/${teacherCourseId}?academicPeriodId=${teacherPeriodId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.course.id).toBe(teacherCourseId);
      expect(res.body.summary.totalStudents).toBeGreaterThan(0);
      expect(res.body.students[0]).toHaveProperty('student');
      expect(res.body.students[0]).toHaveProperty('attendance');
    });

    it('should deny a STUDENT for a course they are not enrolled in', async () => {
      if (!unrelatedCourseId) return;
      await request(app.getHttpServer())
        .get(`/api/v1/reports/courses/${unrelatedCourseId}?academicPeriodId=${teacherPeriodId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });
  });

  describe('Exports and audit', () => {
    it('should export a PDF bulletin and log BULLETIN_EXPORTED', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/reports/students/${teacherStudentId}/bulletin/export?academicPeriodId=${teacherPeriodId}`,
        )
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'BULLETIN_EXPORTED', entityId: teacherStudentId },
      });
      expect(audit).not.toBeNull();
    });

    it('should export a CSV course report and log REPORT_EXPORTED', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/reports/courses/${teacherCourseId}/export?academicPeriodId=${teacherPeriodId}`,
        )
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.headers['content-type']).toContain('text/csv');
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'REPORT_EXPORTED', entityId: teacherCourseId },
      });
      expect(audit).not.toBeNull();
    });
  });
});
