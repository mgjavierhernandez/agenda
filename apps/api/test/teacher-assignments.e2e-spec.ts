import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('Teacher Assignments Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;
  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let testCourseId: string;
  let testSubjectId: string;
  let testAcademicPeriodId: string;
  let createdAssignmentId: string;

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
    const demoInstitution = await prisma.institution.findUnique({ where: { slug: 'demo-school' } });
    demoInstitutionId = demoInstitution!.id;
    const secondInstitution = await prisma.institution.create({
      data: { name: 'Second School TA', slug: 'second-schoolta-e2e', status: 'ACTIVE' },
    });
    secondInstitutionId = secondInstitution.id;
    const secondTeacherRole = await prisma.role.create({
      data: { name: 'TEACHER', roleType: 'TENANT', institutionId: secondInstitutionId },
    });
    const secondAdminRole = await prisma.role.create({
      data: { name: 'INSTITUTION_ADMIN', roleType: 'TENANT', institutionId: secondInstitutionId },
    });
    const allPermissions = await prisma.permission.findMany();
    for (const perm of allPermissions) {
      await prisma.rolePermission.create({
        data: { roleId: secondAdminRole.id, permissionId: perm.id },
      });
    }
    const secondTeacher = await prisma.user.create({
      data: {
        email: 'teacher@second-schoolta-e2e.dev',
        passwordHash: VALID_PASSWORD_HASH,
        firstName: 'Second',
        lastName: 'Teacher',
        status: 'ACTIVE',
      },
    });
    const secondTeacherMem = await prisma.userInstitution.create({
      data: {
        userId: secondTeacher.id,
        institutionId: secondInstitutionId,
        status: MembershipStatus.ACTIVE,
      },
    });
    await prisma.userRole.create({
      data: {
        userInstitutionId: secondTeacherMem.id,
        roleId: secondTeacherRole.id,
        institutionId: secondInstitutionId,
      },
    });
    const secondAdmin = await prisma.user.create({
      data: {
        email: 'admin@second-schoolta-e2e.dev',
        passwordHash: VALID_PASSWORD_HASH,
        firstName: 'Second',
        lastName: 'Admin',
        status: 'ACTIVE',
      },
    });
    const secondAdminMem = await prisma.userInstitution.create({
      data: {
        userId: secondAdmin.id,
        institutionId: secondInstitutionId,
        status: MembershipStatus.ACTIVE,
      },
    });
    await prisma.userRole.create({
      data: {
        userInstitutionId: secondAdminMem.id,
        roleId: secondAdminRole.id,
        institutionId: secondInstitutionId,
      },
    });
    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Demo1234!' });
      return res.body.accessToken;
    };
    adminToken = await login('admin@demo-school.dev');
    teacherToken = await login('teacher@demo-school.dev');
    parentToken = await login('parent@demo-school.dev');
    const tc = await prisma.course.create({
      data: {
        institutionId: demoInstitutionId,
        code: 'TAC' + Date.now().toString().slice(-6),
        name: 'E2E TA Course',
        status: 'ACTIVE',
      },
    });
    testCourseId = tc.id;
    const ts = await prisma.subject.create({
      data: {
        institutionId: demoInstitutionId,
        code: 'TAS' + Date.now().toString().slice(-6),
        name: 'E2E TA Subject',
        status: 'ACTIVE',
      },
    });
    testSubjectId = ts.id;
    const ap = await prisma.academicPeriod.create({
      data: {
        institutionId: demoInstitutionId,
        name: 'E2E TA Period',
        code: 'TAP' + Date.now().toString().slice(-6),
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-06-30'),
      },
    });
    testAcademicPeriodId = ap.id;
  }, 30000);

  afterAll(async () => {
    await prisma.teacherAssignment.deleteMany({ where: { courseId: testCourseId } });
    await prisma.course.delete({ where: { id: testCourseId } });
    await prisma.subject.delete({ where: { id: testSubjectId } });
    await prisma.academicPeriod.delete({ where: { id: testAcademicPeriodId } });
    await prisma.userRole.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.rolePermission.deleteMany({
      where: { role: { institutionId: secondInstitutionId } },
    });
    await prisma.userInstitution.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.role.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.teacherAssignment.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.institution.delete({ where: { id: secondInstitutionId } });
    await prisma.user.delete({ where: { email: 'teacher@second-schoolta-e2e.dev' } });
    await prisma.user.delete({ where: { email: 'admin@second-schoolta-e2e.dev' } });
    await app.close();
    await prisma.$disconnect();
  });
  describe('Authentication', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/teacher-assignments')
        .set('X-Institution-Id', demoInstitutionId)
        .expect(401);
    });
  });

  describe('RBAC', () => {
    it('should return 403 for parent without teacher-assignments:manage', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          teacherUserId: '00000000-0000-0000-0000-000000000000',
          courseId: testCourseId,
          subjectId: testSubjectId,
          academicPeriodId: testAcademicPeriodId,
        })
        .expect(403);
    });
  });

  describe('POST /api/v1/teacher-assignments', () => {
    it('should create teacher assignment as admin', async () => {
      const teacherUser = await prisma.user.findUnique({
        where: { email: 'teacher@demo-school.dev' },
      });
      const res = await request(app.getHttpServer())
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          teacherUserId: teacherUser!.id,
          courseId: testCourseId,
          subjectId: testSubjectId,
          academicPeriodId: testAcademicPeriodId,
        })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.institutionId).toBe(demoInstitutionId);
      expect(res.body.status).toBe('ACTIVE');
      createdAssignmentId = res.body.id;
    });
    it('should reject duplicate assignment', async () => {
      const teacherUser = await prisma.user.findUnique({
        where: { email: 'teacher@demo-school.dev' },
      });
      await request(app.getHttpServer())
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          teacherUserId: teacherUser!.id,
          courseId: testCourseId,
          subjectId: testSubjectId,
          academicPeriodId: testAcademicPeriodId,
        })
        .expect(409);
    });
    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({})
        .expect(400);
    });
    it('should reject body tampering (institutionId)', async () => {
      const teacherUser = await prisma.user.findUnique({
        where: { email: 'teacher@demo-school.dev' },
      });
      await request(app.getHttpServer())
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          teacherUserId: teacherUser!.id,
          courseId: testCourseId,
          subjectId: testSubjectId,
          academicPeriodId: testAcademicPeriodId,
          institutionId: secondInstitutionId,
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/teacher-assignments', () => {
    it('should return paginated list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      for (const ta of res.body.data) {
        expect(ta.institutionId).toBe(demoInstitutionId);
      }
    });
    it('should return 200 for teacher with teacher-assignments:read', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
    });
    it('should return correct pagination meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/teacher-assignments?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(1);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('totalPages');
    });
  });

  describe('GET /api/v1/teacher-assignments/:id', () => {
    it('should return teacher assignment by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/teacher-assignments/${createdAssignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.id).toBe(createdAssignmentId);
      expect(res.body.institutionId).toBe(demoInstitutionId);
    });
    it('should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/teacher-assignments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });
    it('should return 404 for cross-tenant resource', async () => {
      const other = await prisma.teacherAssignment.findFirst({
        where: { institutionId: secondInstitutionId },
      });
      if (other) {
        await request(app.getHttpServer())
          .get(`/api/v1/teacher-assignments/${other.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(404);
      }
    });
  });

  describe('PATCH /api/v1/teacher-assignments/:id', () => {
    it('should update teacher assignment status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/teacher-assignments/${createdAssignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ status: 'INACTIVE' })
        .expect(200);
      expect(res.body.status).toBe('INACTIVE');
    });
    it('should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/teacher-assignments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ status: 'ACTIVE' })
        .expect(404);
    });
  });

  describe('PATCH /api/v1/teacher-assignments/:id/deactivate', () => {
    it('should deactivate teacher assignment', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/teacher-assignments/${createdAssignmentId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.status).toBe('INACTIVE');
    });
    it('should return 404 for cross-tenant deactivation', async () => {
      const other = await prisma.teacherAssignment.findFirst({
        where: { institutionId: secondInstitutionId },
      });
      if (other) {
        await request(app.getHttpServer())
          .patch(`/api/v1/teacher-assignments/${other.id}/deactivate`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(404);
      }
    });
  });

  describe('Tenant Isolation', () => {
    it('should not allow Tenant A to access Tenant B resources', async () => {
      const sa = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@second-schoolta-e2e.dev', password: 'Demo1234!' });
      const res = await request(app.getHttpServer())
        .get('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${sa.body.accessToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);
      for (const ta of res.body.data) {
        expect(ta.institutionId).toBe(secondInstitutionId);
      }
    });
  });

  describe('Duplication Prevention', () => {
    it('should reject duplicate creation', async () => {
      const teacherUser = await prisma.user.findUnique({
        where: { email: 'teacher@demo-school.dev' },
      });
      await request(app.getHttpServer())
        .post('/api/v1/teacher-assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          teacherUserId: teacherUser!.id,
          courseId: testCourseId,
          subjectId: testSubjectId,
          academicPeriodId: testAcademicPeriodId,
        })
        .expect(409);
    });
  });
});
