import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus, DayOfWeek } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('Schedules Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;

  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let studentToken: string;

  let demoCourseId: string;
  let demoSubjectId: string;
  let createdScheduleId: string;

  let secondCourseId: string;
  let secondSubjectId: string;

  const testCreatedScheduleIds: string[] = [];

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

    const demoCourse = await prisma.course.findFirst({
      where: { institutionId: demoInstitutionId },
    });
    demoCourseId = demoCourse!.id;

    const demoSubject = await prisma.subject.findFirst({
      where: { institutionId: demoInstitutionId },
    });
    demoSubjectId = demoSubject!.id;

    // Clean up any stale test-created schedules for this course/day that
    // may have been left behind by previous E2E runs.  We only delete
    // schedules that are NOT part of the seed (seed uses 08:00-09:30,
    // 10:00-11:30 and specific course/subject combos).
    const staleTestSchedules = await prisma.schedule.findMany({
      where: {
        institutionId: demoInstitutionId,
        courseId: demoCourseId,
        dayOfWeek: DayOfWeek.TUESDAY,
        status: 'ACTIVE',
      },
    });
    for (const s of staleTestSchedules) {
      const startStr = String(s.startTime).slice(0, 5);
      if (startStr !== '10:00') {
        await prisma.schedule.delete({ where: { id: s.id } });
      }
    }

    // Create second institution for cross-tenant tests
    const secondInstitution = await prisma.institution.create({
      data: {
        name: 'Second School Schedules',
        slug: 'second-school-schedules-e2e',
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
        email: 'admin@second-schedules-e2e.dev',
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
  }, 30000);

  afterAll(async () => {
    // Clean up test-created schedules from demo institution
    for (const id of testCreatedScheduleIds) {
      await prisma.schedule.delete({ where: { id } }).catch(() => {});
    }

    // Clean up second institution resources
    await prisma.schedule.deleteMany({
      where: { institutionId: secondInstitutionId },
    });
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
    await prisma.user.delete({ where: { email: 'admin@second-schedules-e2e.dev' } });
    await app.close();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/schedules', () => {
    it('TEST-01: Admin creates schedule → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dayOfWeek: 'TUESDAY',
          startTime: '14:00',
          endTime: '15:30',
          classroom: 'Aula E2E',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.institutionId).toBe(demoInstitutionId);
      expect(res.body.dayOfWeek).toBe('TUESDAY');
      createdScheduleId = res.body.id;
      testCreatedScheduleIds.push(res.body.id);
    });

    it('TEST-02: Teacher without schedules:manage → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dayOfWeek: 'FRIDAY',
          startTime: '14:00',
          endTime: '15:30',
        })
        .expect(403);
    });

    it('TEST-08: Parent without schedules:manage → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dayOfWeek: 'FRIDAY',
          startTime: '14:00',
          endTime: '15:30',
        })
        .expect(403);
    });

    it('TEST-09: Student without schedules:manage → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dayOfWeek: 'FRIDAY',
          startTime: '14:00',
          endTime: '15:30',
        })
        .expect(403);
    });

    it('TEST-22: Body institutionId is rejected by forbidNonWhitelisted → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dayOfWeek: 'FRIDAY',
          startTime: '14:00',
          endTime: '15:30',
          institutionId: secondInstitutionId,
        })
        .expect(400);
    });

    it('TEST-19: Should reject course from another tenant → 404', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          courseId: secondCourseId,
          subjectId: demoSubjectId,
          dayOfWeek: 'FRIDAY',
          startTime: '14:00',
          endTime: '15:30',
        })
        .expect(404);
    });

    it('TEST-20: Should reject subject from another tenant → 404', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          courseId: demoCourseId,
          subjectId: secondSubjectId,
          dayOfWeek: 'FRIDAY',
          startTime: '14:00',
          endTime: '15:30',
        })
        .expect(404);
    });

    it('should reject missing required fields → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({})
        .expect(400);
    });

    it('should reject startTime >= endTime → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dayOfWeek: 'FRIDAY',
          startTime: '15:30',
          endTime: '14:00',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/schedules', () => {
    it('TEST-03: Admin lists schedules → only current tenant', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      for (const schedule of res.body.data) {
        expect(schedule.institutionId).toBe(demoInstitutionId);
      }
    });

    it('TEST-04: Parent with schedules:read → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/schedules')
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('TEST-05: Student with schedules:read → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/schedules')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by courseId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/schedules?courseId=${demoCourseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      for (const schedule of res.body.data) {
        expect(schedule.courseId).toBe(demoCourseId);
      }
    });

    it('should filter by subjectId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/schedules?subjectId=${demoSubjectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      for (const schedule of res.body.data) {
        expect(schedule.subjectId).toBe(demoSubjectId);
      }
    });

    it('should filter by dayOfWeek', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/schedules?dayOfWeek=MONDAY')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      for (const schedule of res.body.data) {
        expect(schedule.dayOfWeek).toBe('MONDAY');
      }
    });

    it('should filter by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/schedules?status=ACTIVE')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      for (const schedule of res.body.data) {
        expect(schedule.status).toBe('ACTIVE');
      }
    });

    it('TEST-25: Pagination returns correct meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/schedules?page=1&limit=2')
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

  describe('GET /api/v1/schedules/:id', () => {
    it('TEST-06: Admin gets schedule by ID → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/schedules/${createdScheduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.id).toBe(createdScheduleId);
      expect(res.body.institutionId).toBe(demoInstitutionId);
    });

    it('TEST-16: Admin gets schedule from other tenant → 404', async () => {
      const otherSchedule = await prisma.schedule.findFirst({
        where: { institutionId: secondInstitutionId },
      });

      if (otherSchedule) {
        await request(app.getHttpServer())
          .get(`/api/v1/schedules/${otherSchedule.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(404);
      }
    });

    it('should return 404 for non-existent schedule', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/schedules/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/schedules/:id', () => {
    it('TEST-07: Admin updates schedule in current tenant → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/schedules/${createdScheduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ classroom: 'Aula Updated' })
        .expect(200);

      expect(res.body.classroom).toBe('Aula Updated');
    });

    it('TEST-17: Admin updates schedule from other tenant → 404', async () => {
      const otherSchedule = await prisma.schedule.findFirst({
        where: { institutionId: secondInstitutionId },
      });

      if (otherSchedule) {
        await request(app.getHttpServer())
          .patch(`/api/v1/schedules/${otherSchedule.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .send({ classroom: 'FAIL' })
          .expect(404);
      }
    });

    it('TEST-23: Body institutionId rejected on PATCH → 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/schedules/${createdScheduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ institutionId: secondInstitutionId })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/schedules/:id/deactivate', () => {
    it('TEST-07b: Admin deactivates schedule from other tenant → 404', async () => {
      const otherSchedule = await prisma.schedule.findFirst({
        where: { institutionId: secondInstitutionId },
      });

      if (otherSchedule) {
        await request(app.getHttpServer())
          .patch(`/api/v1/schedules/${otherSchedule.id}/deactivate`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(404);
      }
    });

    it('TEST-05b: Admin deactivates schedule in current tenant → 200', async () => {
      // Create a new schedule to deactivate
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dayOfWeek: 'SATURDAY',
          startTime: '08:00',
          endTime: '09:00',
        });
      testCreatedScheduleIds.push(createRes.body.id);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/schedules/${createRes.body.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.status).toBe('INACTIVE');
    });
  });

  describe('Authentication + Tenant guards', () => {
    it('TEST-11: Without access token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/schedules')
        .set('X-Institution-Id', demoInstitutionId)
        .expect(401);
    });

    it('TEST-12b: Without X-Institution-Id → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('TEST-12c: Institution without membership → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(403);
    });

    it('TEST-13: Inactive membership → 403', async () => {
      const inactiveUser = await prisma.user.create({
        data: {
          email: 'inactive-schedule-e2e@demo.dev',
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
          .send({ email: 'inactive-schedule-e2e@demo.dev', password: 'Demo1234!' });

        await request(app.getHttpServer())
          .get('/api/v1/schedules')
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
          name: 'Inactive Schedules E2E',
          slug: 'inactive-schedules-e2e',
          status: 'INACTIVE',
        },
      });

      const user = await prisma.user.create({
        data: {
          email: 'inactive-inst-schedule-e2e@demo.dev',
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
          .send({ email: 'inactive-inst-schedule-e2e@demo.dev', password: 'Demo1234!' });

        await request(app.getHttpServer())
          .get('/api/v1/schedules')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .set('X-Institution-Id', inactiveInst.id)
          .expect(403);
      } finally {
        await prisma.userInstitution.delete({ where: { id: membership.id } });
        await prisma.user.delete({ where: { id: user.id } });
        await prisma.institution.delete({ where: { id: inactiveInst.id } });
      }
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

    it('TEST-29: SUPER_ADMIN with membership in A can operate in A', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/schedules')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('SUPER_ADMIN can access any institution (auto-creates membership)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/schedules')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });
});
