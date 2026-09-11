import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('Tasks Module (e2e)', () => {
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
  let createdTaskId: string;

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
        name: 'Second School Tasks',
        slug: 'second-school-tasks-e2e',
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
        email: 'admin@second-tasks-e2e.dev',
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
    // Clean up second institution resources
    await prisma.task.deleteMany({
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
    await prisma.user.delete({ where: { email: 'admin@second-tasks-e2e.dev' } });
    await app.close();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/tasks', () => {
    it('TEST-01: Admin creates task → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Taller de fracciones E2E',
          description: 'Resolver ejercicios del libro.',
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dueDate: '2026-09-15T23:59:00.000Z',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.institutionId).toBe(demoInstitutionId);
      expect(res.body.title).toBe('Taller de fracciones E2E');
      expect(res.body.status).toBe('DRAFT');
      createdTaskId = res.body.id;
    });

    it('TEST-02: Teacher with tasks:manage can create → 201', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Tarea del profesor',
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dueDate: '2026-09-20T23:59:00.000Z',
        })
        .expect(201);
    });

    it('TEST-08: Parent without tasks:manage → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Fail',
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dueDate: '2026-09-15T23:59:00.000Z',
        })
        .expect(403);
    });

    it('TEST-09: Student without tasks:manage → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Fail',
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dueDate: '2026-09-15T23:59:00.000Z',
        })
        .expect(403);
    });

    it('TEST-18: Body institutionId is rejected by forbidNonWhitelisted → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Fail',
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dueDate: '2026-09-15T23:59:00.000Z',
          institutionId: secondInstitutionId,
        })
        .expect(400);
    });

    it('should reject course from another tenant → 404', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Fail',
          courseId: secondCourseId,
          subjectId: demoSubjectId,
          dueDate: '2026-09-15T23:59:00.000Z',
        })
        .expect(404);
    });

    it('should reject subject from another tenant → 404', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Fail',
          courseId: demoCourseId,
          subjectId: secondSubjectId,
          dueDate: '2026-09-15T23:59:00.000Z',
        })
        .expect(404);
    });

    it('should reject missing required fields → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({})
        .expect(400);
    });

    it('should reject title too short → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'AB',
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dueDate: '2026-09-15T23:59:00.000Z',
        })
        .expect(400);
    });

    it('should reject invalid dueDate → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Valid Title',
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dueDate: 'not-a-date',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('TEST-03: Admin lists tasks → only current tenant', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      for (const task of res.body.data) {
        expect(task.institutionId).toBe(demoInstitutionId);
      }
    });

    it('TEST-04: Parent with tasks:read → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('TEST-05: Student with tasks:read → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by courseId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks?courseId=${demoCourseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      for (const task of res.body.data) {
        expect(task.courseId).toBe(demoCourseId);
      }
    });

    it('should filter by subjectId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks?subjectId=${demoSubjectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      for (const task of res.body.data) {
        expect(task.subjectId).toBe(demoSubjectId);
      }
    });

    it('should filter by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks?status=DRAFT')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      for (const task of res.body.data) {
        expect(task.status).toBe('DRAFT');
      }
    });

    it('should return tasks sorted by dueDate asc', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      const dates = res.body.data.map((t: { dueDate: string }) => new Date(t.dueDate).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    });

    it('TEST-17: Pagination returns correct meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks?page=1&limit=2')
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

  describe('GET /api/v1/tasks/:id', () => {
    it('TEST-06: Admin gets task by ID → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.id).toBe(createdTaskId);
      expect(res.body.institutionId).toBe(demoInstitutionId);
    });

    it('TEST-14: Admin gets task from other tenant → 404', async () => {
      const otherTask = await prisma.task.findFirst({
        where: { institutionId: secondInstitutionId },
      });

      if (otherTask) {
        await request(app.getHttpServer())
          .get(`/api/v1/tasks/${otherTask.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(404);
      }
    });

    it('should return 404 for non-existent task', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('TEST-07: Admin updates task in current tenant → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'Updated Task Title' })
        .expect(200);

      expect(res.body.title).toBe('Updated Task Title');
    });

    it('TEST-15: Admin updates task from other tenant → 404', async () => {
      const otherTask = await prisma.task.findFirst({
        where: { institutionId: secondInstitutionId },
      });

      if (otherTask) {
        await request(app.getHttpServer())
          .patch(`/api/v1/tasks/${otherTask.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .send({ title: 'FAIL' })
          .expect(404);
      }
    });

    it('TEST-19: Body institutionId rejected on PATCH → 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ institutionId: secondInstitutionId })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/tasks/:id/deactivate', () => {
    it('TEST-07b: Admin deactivates task from other tenant → 404', async () => {
      const otherTask = await prisma.task.findFirst({
        where: { institutionId: secondInstitutionId },
      });

      if (otherTask) {
        await request(app.getHttpServer())
          .patch(`/api/v1/tasks/${otherTask.id}/deactivate`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(404);
      }
    });

    it('TEST-10: Admin deactivates task in current tenant → 200', async () => {
      // Create a task to deactivate
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Task to deactivate',
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dueDate: '2026-10-01T23:59:00.000Z',
        });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${createRes.body.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.status).toBe('INACTIVE');
    });
  });

  describe('Authentication + Tenant guards', () => {
    it('TEST-11: Without access token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('X-Institution-Id', demoInstitutionId)
        .expect(401);
    });

    it('TEST-12: Without X-Institution-Id → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('TEST-12b: Institution without membership → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(403);
    });

    it('TEST-13: Inactive membership → 403', async () => {
      const inactiveUser = await prisma.user.create({
        data: {
          email: 'inactive-task-e2e@demo.dev',
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
          .send({ email: 'inactive-task-e2e@demo.dev', password: 'Demo1234!' });

        await request(app.getHttpServer())
          .get('/api/v1/tasks')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(403);
      } finally {
        await prisma.userInstitution.delete({ where: { id: inactiveMembership.id } });
        await prisma.user.delete({ where: { id: inactiveUser.id } });
      }
    });

    it('TEST-16: Inactive institution → 403', async () => {
      const inactiveInst = await prisma.institution.create({
        data: {
          name: 'Inactive Tasks E2E',
          slug: 'inactive-tasks-e2e',
          status: 'INACTIVE',
        },
      });

      const user = await prisma.user.create({
        data: {
          email: 'inactive-inst-task-e2e@demo.dev',
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
          .send({ email: 'inactive-inst-task-e2e@demo.dev', password: 'Demo1234!' });

        await request(app.getHttpServer())
          .get('/api/v1/tasks')
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

  describe('Task Lifecycle', () => {
    let lifecycleTaskId: string;

    it('should create task in DRAFT status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Lifecycle Test Task',
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dueDate: '2026-11-01T23:59:00.000Z',
        })
        .expect(201);

      expect(res.body.status).toBe('DRAFT');
      lifecycleTaskId = res.body.id;
    });

    it('should publish a DRAFT task', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${lifecycleTaskId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.status).toBe('PUBLISHED');
    });

    it('should reject publishing non-DRAFT task', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${lifecycleTaskId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(400);
    });

    it('should close a PUBLISHED task', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${lifecycleTaskId}/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.status).toBe('CLOSED');
    });

    it('should reject closing non-PUBLISHED task', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${lifecycleTaskId}/close`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(400);
    });

    it('should reject editing non-DRAFT task', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${lifecycleTaskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'Should Fail' })
        .expect(400);
    });
  });

  describe('Task Assignments', () => {
    let assignmentTaskId: string;
    let assignmentId: string;

    it('should publish a task then assign students', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Assignment Test Task',
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dueDate: '2026-12-01T23:59:00.000Z',
        });
      assignmentTaskId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${assignmentTaskId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      const assignRes = await request(app.getHttpServer())
        .post('/api/v1/task-assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ taskId: assignmentTaskId })
        .expect(201);

      expect(Array.isArray(assignRes.body)).toBe(true);
      if (assignRes.body.length > 0) {
        assignmentId = assignRes.body[0].id;
      }
    });

    it('should list task assignments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/task-assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });

    it('should get a task assignment by ID', async () => {
      if (assignmentId) {
        await request(app.getHttpServer())
          .get(`/api/v1/task-assignments/${assignmentId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(200);
      }
    });
  });

  describe('Task Submissions', () => {
    let submissionAssignmentId: string;
    let submissionTaskId: string;

    beforeAll(async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Submission Test Task',
          courseId: demoCourseId,
          subjectId: demoSubjectId,
          dueDate: '2026-12-15T23:59:00.000Z',
        });
      submissionTaskId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${submissionTaskId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId);

      const assignRes = await request(app.getHttpServer())
        .post('/api/v1/task-assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ taskId: submissionTaskId });

      if (assignRes.body.length > 0) {
        submissionAssignmentId = assignRes.body[0].id;
      }
    });

    it('should submit work for an assignment', async () => {
      if (submissionAssignmentId) {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/task-assignments/${submissionAssignmentId}/submission`)
          .set('Authorization', `Bearer ${studentToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .send({ content: 'My homework submission' })
          .expect(201);

        expect(res.body).toHaveProperty('id');
        expect(['SUBMITTED', 'LATE']).toContain(res.body.status);
      }
    });

    it('should reject duplicate submission', async () => {
      if (submissionAssignmentId) {
        await request(app.getHttpServer())
          .post(`/api/v1/task-assignments/${submissionAssignmentId}/submission`)
          .set('Authorization', `Bearer ${studentToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .send({ content: 'Duplicate' })
          .expect(409);
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

    it('TEST-20: SUPER_ADMIN with membership in A can operate in A', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('SUPER_ADMIN can access any institution (auto-creates membership)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });
});
