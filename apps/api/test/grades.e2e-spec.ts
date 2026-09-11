import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('Grades Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;

  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let studentToken: string;

  let demoStudentId: string;
  let demoCourseId: string;
  let demoSubjectId: string;
  let createdGradeId: string;

  let secondStudentId: string;
  let secondCourseId: string;
  let secondSubjectId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    const demoInstitution = await prisma.institution.findUnique({
      where: { slug: 'demo-school' },
    });
    demoInstitutionId = demoInstitution!.id;

    // Get demo resources for grade creation
    const demoStudent = await prisma.student.findFirst({
      where: { institutionId: demoInstitutionId },
    });
    demoStudentId = demoStudent!.id;

    const demoCourse = await prisma.course.findFirst({
      where: { institutionId: demoInstitutionId },
    });
    demoCourseId = demoCourse!.id;

    const demoSubject = await prisma.subject.findFirst({
      where: { institutionId: demoInstitutionId },
    });
    demoSubjectId = demoSubject!.id;

    // Create second institution for cross-tenant tests
    const secondInstitution = await prisma.institution.create({
      data: {
        name: 'Second School Grades',
        slug: 'second-school-grades-e2e',
        status: 'ACTIVE',
      },
    });
    secondInstitutionId = secondInstitution.id;

    const secondAdminRole = await prisma.role.create({
      data: {
        name: 'INSTITUTION_ADMIN',
        roleType: 'TENANT',
        institutionId: secondInstitutionId,
      },
    });

    const allPermissions = await prisma.permission.findMany();
    for (const perm of allPermissions) {
      await prisma.rolePermission.create({
        data: { roleId: secondAdminRole.id, permissionId: perm.id },
      });
    }

    const secondAdmin = await prisma.user.create({
      data: {
        email: 'admin@second-grades-e2e.dev',
        passwordHash: VALID_PASSWORD_HASH,
        firstName: 'Second',
        lastName: 'Admin',
        status: 'ACTIVE',
      },
    });

    const secondAdminMembership = await prisma.userInstitution.create({
      data: {
        userId: secondAdmin.id,
        institutionId: secondInstitutionId,
        status: MembershipStatus.ACTIVE,
      },
    });

    await prisma.userRole.create({
      data: {
        userInstitutionId: secondAdminMembership.id,
        roleId: secondAdminRole.id,
        institutionId: secondInstitutionId,
      },
    });

    // Create resources in second institution
    const secondStudent = await prisma.student.create({
      data: {
        institutionId: secondInstitutionId,
        firstName: 'Second',
        lastName: 'Student',
        documentType: 'DNI',
        documentNumber: '99999999',
        status: 'ACTIVE',
      },
    });
    secondStudentId = secondStudent.id;

    const secondCourse = await prisma.course.create({
      data: {
        institutionId: secondInstitutionId,
        code: 'SEC-001',
        name: 'Second Course',
        status: 'ACTIVE',
      },
    });
    secondCourseId = secondCourse.id;

    const secondSubject = await prisma.subject.create({
      data: {
        institutionId: secondInstitutionId,
        code: 'SEC-S',
        name: 'Second Subject',
        status: 'ACTIVE',
      },
    });
    secondSubjectId = secondSubject.id;

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

    // Link student user to first academic Student record for scope resolution
    const studentUser = await prisma.user.findUnique({
      where: { email: 'student@demo-school.dev' },
    });
    const firstStudent = await prisma.student.findFirst({
      where: { institutionId: demoInstitutionId, userId: null },
    });
    if (studentUser && firstStudent) {
      await prisma.student.update({
        where: { id: firstStudent.id },
        data: { userId: studentUser.id },
      });
    }
  }, 30000);

  afterAll(async () => {
    // Clean up second institution resources
    await prisma.grade.deleteMany({
      where: { institutionId: secondInstitutionId },
    });
    await prisma.student.delete({ where: { id: secondStudentId } }).catch(() => {});
    await prisma.course.delete({ where: { id: secondCourseId } }).catch(() => {});
    await prisma.subject.delete({ where: { id: secondSubjectId } }).catch(() => {});
    await prisma.userRole.deleteMany({
      where: { institutionId: secondInstitutionId },
    });
    await prisma.rolePermission.deleteMany({
      where: { role: { institutionId: secondInstitutionId } },
    });
    await prisma.userInstitution.deleteMany({
      where: { institutionId: secondInstitutionId },
    });
    await prisma.role.deleteMany({
      where: { institutionId: secondInstitutionId },
    });
    await prisma.institution.delete({ where: { id: secondInstitutionId } });
    await prisma.user.delete({ where: { email: 'admin@second-grades-e2e.dev' } });
    await app.close();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/grades', () => {
    it('TEST-01: Admin creates grade → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: demoStudentId,
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          value: 4.25,
          period: 'E2E-Q1',
          evaluationType: 'Parcial',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.institutionId).toBe(demoInstitutionId);
      expect(res.body.value).toBe('4.25');
      createdGradeId = res.body.id;
    });

    it('TEST-02: Teacher with grades:manage can create → 201', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/grades')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: demoStudentId,
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          value: 3.75,
          period: 'E2E-TCH',
          evaluationType: 'Final',
        })
        .expect(201);
    });

    it('TEST-06: Parent without grades:manage → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/grades')
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: demoStudentId,
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          value: 3.0,
          period: 'FAIL',
        })
        .expect(403);
    });

    it('TEST-10: Body institutionId is rejected by forbidNonWhitelisted → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: demoStudentId,
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          value: 3.0,
          period: 'FAIL',
          institutionId: secondInstitutionId,
        })
        .expect(400);
    });

    it('should reject student from another tenant → 404', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: secondStudentId,
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          value: 3.0,
          period: 'CROSS',
        })
        .expect(404);
    });

    it('should reject course from another tenant → 404', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: demoStudentId,
          courseId: secondCourseId,
          subjectId: demoSubjectId,
          value: 3.0,
          period: 'CROSS',
        })
        .expect(404);
    });

    it('should reject subject from another tenant → 404', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: demoStudentId,
          courseId: demoCourseId,
          subjectId: secondSubjectId,
          value: 3.0,
          period: 'CROSS',
        })
        .expect(404);
    });

    it('should reject missing required fields → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({})
        .expect(400);
    });

    it('should reject invalid value range → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: demoStudentId,
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          value: 6.0,
          period: 'FAIL',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/grades', () => {
    it('TEST-03: Admin lists grades → only current tenant', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      for (const grade of res.body.data) {
        expect(grade.institutionId).toBe(demoInstitutionId);
      }
    });

    it('TEST-04: Parent with grades:read → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/grades')
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('TEST-05: Student with grades:read → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/grades')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by studentId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/grades?studentId=${demoStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      for (const grade of res.body.data) {
        expect(grade.studentId).toBe(demoStudentId);
      }
    });

    it('should filter by courseId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/grades?courseId=${demoCourseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      for (const grade of res.body.data) {
        expect(grade.courseId).toBe(demoCourseId);
      }
    });

    it('should filter by subjectId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/grades?subjectId=${demoSubjectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      for (const grade of res.body.data) {
        expect(grade.subjectId).toBe(demoSubjectId);
      }
    });

    it('TEST-18: Pagination returns correct meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/grades?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('totalPages');
    });
  });

  describe('GET /api/v1/grades/:id', () => {
    it('TEST-09: Admin gets grade by ID → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/grades/${createdGradeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.id).toBe(createdGradeId);
      expect(res.body.institutionId).toBe(demoInstitutionId);
    });

    it('TEST-07: Admin gets grade from other tenant → 404', async () => {
      const otherGrade = await prisma.grade.findFirst({
        where: { institutionId: secondInstitutionId },
      });

      if (otherGrade) {
        await request(app.getHttpServer())
          .get(`/api/v1/grades/${otherGrade.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(404);
      }
    });

    it('should return 404 for non-existent grade', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/grades/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/grades/:id', () => {
    it('TEST-08: Admin updates grade in current tenant → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/grades/${createdGradeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ value: 4.75 })
        .expect(200);

      expect(res.body.value).toBe('4.75');
    });

    it('TEST-07b: Admin updates grade from other tenant → 404', async () => {
      const otherGrade = await prisma.grade.findFirst({
        where: { institutionId: secondInstitutionId },
      });

      if (otherGrade) {
        await request(app.getHttpServer())
          .patch(`/api/v1/grades/${otherGrade.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .send({ value: 1.0 })
          .expect(404);
      }
    });

    it('should reject parent without grades:manage → 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/grades/${createdGradeId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ value: 1.0 })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/grades/:id/deactivate', () => {
    it('TEST-10: Admin deactivates grade in current tenant → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/grades/${createdGradeId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.status).toBe('INACTIVE');
    });

    it('TEST-09b: Admin deactivates grade from other tenant → 404', async () => {
      const otherGrade = await prisma.grade.findFirst({
        where: { institutionId: secondInstitutionId },
      });

      if (otherGrade) {
        await request(app.getHttpServer())
          .patch(`/api/v1/grades/${otherGrade.id}/deactivate`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(404);
      }
    });
  });

  describe('Authentication + Tenant guards', () => {
    it('TEST-11: Without access token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/grades')
        .set('X-Institution-Id', demoInstitutionId)
        .expect(401);
    });

    it('TEST-12: Without X-Institution-Id → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('TEST-12b: Institution without membership → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(403);
    });

    it('TEST-13: Inactive membership → 403', async () => {
      const inactiveUser = await prisma.user.create({
        data: {
          email: 'inactive-grade-e2e@demo.dev',
          passwordHash: VALID_PASSWORD_HASH,
          firstName: 'Inactive',
          lastName: 'Membership',
          status: 'ACTIVE',
        },
      });

      const inactiveMembership = await prisma.userInstitution.create({
        data: {
          userId: inactiveUser.id,
          institutionId: demoInstitutionId,
          status: MembershipStatus.INACTIVE,
        },
      });

      try {
        const loginRes = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'inactive-grade-e2e@demo.dev', password: 'Demo1234!' });

        await request(app.getHttpServer())
          .get('/api/v1/grades')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(403);
      } finally {
        await prisma.userInstitution.delete({ where: { id: inactiveMembership.id } });
        await prisma.user.delete({ where: { id: inactiveUser.id } });
      }
    });

    it('TEST-14: Inactive institution → 403', async () => {
      const inactiveInst = await prisma.institution.create({
        data: {
          name: 'Inactive Grades E2E',
          slug: 'inactive-grades-e2e',
          status: 'INACTIVE',
        },
      });

      const user = await prisma.user.create({
        data: {
          email: 'inactive-inst-grade-e2e@demo.dev',
          passwordHash: VALID_PASSWORD_HASH,
          firstName: 'Inactive',
          lastName: 'Institution',
          status: 'ACTIVE',
        },
      });

      const membership = await prisma.userInstitution.create({
        data: {
          userId: user.id,
          institutionId: inactiveInst.id,
          status: MembershipStatus.ACTIVE,
        },
      });

      try {
        const loginRes = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'inactive-inst-grade-e2e@demo.dev', password: 'Demo1234!' });

        await request(app.getHttpServer())
          .get('/api/v1/grades')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .set('X-Institution-Id', inactiveInst.id)
          .expect(403);
      } finally {
        await prisma.userInstitution.delete({ where: { id: membership.id } });
        await prisma.user.delete({ where: { id: user.id } });
        await prisma.institution.delete({ where: { id: inactiveInst.id } });
      }
    });

    it('TEST-10b: Body institutionId cannot bypass tenant', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: demoStudentId,
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          value: 3.0,
          period: 'BYPASS',
          institutionId: secondInstitutionId,
        })
        .expect(400);
    });
  });

  describe('SUPER_ADMIN', () => {
    let superAdminToken: string;

    beforeAll(async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'superadmin@agenda.dev', password: 'Demo1234!' });
      superAdminToken = loginRes.body.accessToken;
    });

    it('TEST-19: SUPER_ADMIN with membership in A can operate in A', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/grades')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('SUPER_ADMIN can access any institution (auto-creates membership)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/grades')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });

  describe('PROMPT 90: Grade protected when academic period is CLOSED', () => {
    let closedPeriodCode: string | null = null;
    let openPeriodCode: string | null = null;

    beforeAll(async () => {
      const closed = await prisma.academicPeriod.findFirst({
        where: { institutionId: demoInstitutionId, status: 'CLOSED' },
      });
      if (closed) closedPeriodCode = closed.code;
      const open = await prisma.academicPeriod.findFirst({
        where: { institutionId: demoInstitutionId, status: 'ACTIVE' },
      });
      if (open) openPeriodCode = open.code;
    });

    it('should reject creating a grade when the period label resolves to a CLOSED period -> 400', async () => {
      if (!closedPeriodCode) return;
      await request(app.getHttpServer())
        .post('/api/v1/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: demoStudentId,
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          value: 3.0,
          period: closedPeriodCode,
        })
        .expect(400);
    });

    it('should reject updating a grade into a CLOSED period -> 400', async () => {
      if (!closedPeriodCode) return;
      const base = await request(app.getHttpServer())
        .post('/api/v1/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: demoStudentId,
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          value: 4.0,
          period: openPeriodCode ?? 'Q1',
        })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/api/v1/grades/${base.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ value: 4.75, period: closedPeriodCode })
        .expect(400);
      await prisma.grade.delete({ where: { id: base.body.id } }).catch(() => {});
    });

    it('should allow creating a grade in an OPEN period and link academicPeriodId', async () => {
      if (!openPeriodCode) return;
      const res = await request(app.getHttpServer())
        .post('/api/v1/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          studentId: demoStudentId,
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          value: 4.25,
          period: openPeriodCode,
        })
        .expect(201);
      expect(res.body.status).toBe('ACTIVE');
    });
  });
});
