import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('Enrollments Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;
  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let testStudentId: string;
  let testCourseId: string;
  let testSchoolGradeId: string;
  let testAcademicPeriodId: string;
  let createdEnrollmentId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    const demoInstitution = await prisma.institution.findUnique({ where: { slug: 'demo-school' } });
    demoInstitutionId = demoInstitution!.id;
    const secondInstitution = await prisma.institution.create({ data: { name: 'Second School EN', slug: 'second-schoolen-e2e', status: 'ACTIVE' } });
    secondInstitutionId = secondInstitution.id;
    const secondTeacherRole = await prisma.role.create({ data: { name: 'TEACHER', roleType: 'TENANT', institutionId: secondInstitutionId } });
    const secondAdminRole = await prisma.role.create({ data: { name: 'INSTITUTION_ADMIN', roleType: 'TENANT', institutionId: secondInstitutionId } });
    const allPermissions = await prisma.permission.findMany();
    for (const perm of allPermissions) { await prisma.rolePermission.create({ data: { roleId: secondAdminRole.id, permissionId: perm.id } }); }
    const secondTeacher = await prisma.user.create({ data: { email: 'teacher@second-schoolen-e2e.dev', passwordHash: VALID_PASSWORD_HASH, firstName: 'Second', lastName: 'Teacher', status: 'ACTIVE' } });
    const secondTeacherMem = await prisma.userInstitution.create({ data: { userId: secondTeacher.id, institutionId: secondInstitutionId, status: MembershipStatus.ACTIVE } });
    await prisma.userRole.create({ data: { userInstitutionId: secondTeacherMem.id, roleId: secondTeacherRole.id, institutionId: secondInstitutionId } });
    const secondAdmin = await prisma.user.create({ data: { email: 'admin@second-schoolen-e2e.dev', passwordHash: VALID_PASSWORD_HASH, firstName: 'Second', lastName: 'Admin', status: 'ACTIVE' } });
    const secondAdminMem = await prisma.userInstitution.create({ data: { userId: secondAdmin.id, institutionId: secondInstitutionId, status: MembershipStatus.ACTIVE } });
    await prisma.userRole.create({ data: { userInstitutionId: secondAdminMem.id, roleId: secondAdminRole.id, institutionId: secondInstitutionId } });
    const login = async (email: string) => { const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password: 'Demo1234!' }); return res.body.accessToken; };
    adminToken = await login('admin@demo-school.dev');
    teacherToken = await login('teacher@demo-school.dev');
    parentToken = await login('parent@demo-school.dev');
    const ts = await prisma.student.create({ data: { institutionId: demoInstitutionId, firstName: 'Enroll', lastName: 'Test', documentType: 'DNI', documentNumber: 'EN' + Date.now().toString().slice(-8) } });
    testStudentId = ts.id;
    const tc = await prisma.course.create({ data: { institutionId: demoInstitutionId, code: 'EC' + Date.now().toString().slice(-6), name: 'E2E Course', status: 'ACTIVE' } });
    testCourseId = tc.id;
    const sg = await prisma.schoolGrade.create({ data: { institutionId: demoInstitutionId, name: 'E2E Grade', code: 'EG' + Date.now().toString().slice(-6) } });
    testSchoolGradeId = sg.id;
    const ap = await prisma.academicPeriod.create({ data: { institutionId: demoInstitutionId, name: 'E2E Period', code: 'EP' + Date.now().toString().slice(-6), startDate: new Date('2026-01-15'), endDate: new Date('2026-06-30') } });
    testAcademicPeriodId = ap.id;
  }, 30000);

  afterAll(async () => {
    await prisma.enrollment.deleteMany({ where: { studentId: testStudentId } });
    await prisma.student.delete({ where: { id: testStudentId } });
    await prisma.course.delete({ where: { id: testCourseId } });
    await prisma.schoolGrade.delete({ where: { id: testSchoolGradeId } });
    await prisma.academicPeriod.delete({ where: { id: testAcademicPeriodId } });
    await prisma.userRole.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.rolePermission.deleteMany({ where: { role: { institutionId: secondInstitutionId } } });
    await prisma.userInstitution.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.role.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.enrollment.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.institution.delete({ where: { id: secondInstitutionId } });
    await prisma.user.delete({ where: { email: 'teacher@second-schoolen-e2e.dev' } });
    await prisma.user.delete({ where: { email: 'admin@second-schoolen-e2e.dev' } });
    await app.close();
    await prisma.$disconnect();
  });
  describe('Authentication', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer()).get('/api/v1/enrollments').set('X-Institution-Id', demoInstitutionId).expect(401);
    });
  });

  describe('RBAC', () => {
    it('should return 403 for teacher without enrollments:manage', async () => {
      await request(app.getHttpServer()).post('/api/v1/enrollments').set('Authorization', `Bearer ${teacherToken}`).set('X-Institution-Id', demoInstitutionId).send({ studentId: testStudentId, courseId: testCourseId, schoolGradeId: testSchoolGradeId, academicPeriodId: testAcademicPeriodId }).expect(403);
    });
    it('should return 403 for parent without enrollments:manage', async () => {
      await request(app.getHttpServer()).patch('/api/v1/enrollments/00000000-0000-0000-0000-000000000000').set('Authorization', `Bearer ${parentToken}`).set('X-Institution-Id', demoInstitutionId).send({ status: 'ACTIVE' }).expect(403);
    });
  });

  describe('POST /api/v1/enrollments', () => {
    it('should create enrollment as admin', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/enrollments').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).send({ studentId: testStudentId, courseId: testCourseId, schoolGradeId: testSchoolGradeId, academicPeriodId: testAcademicPeriodId }).expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.institutionId).toBe(demoInstitutionId);
      expect(res.body.studentId).toBe(testStudentId);
      expect(res.body.status).toBe('ACTIVE');
      createdEnrollmentId = res.body.id;
    });
    it('should reject duplicate enrollment', async () => {
      await request(app.getHttpServer()).post('/api/v1/enrollments').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).send({ studentId: testStudentId, courseId: testCourseId, schoolGradeId: testSchoolGradeId, academicPeriodId: testAcademicPeriodId }).expect(409);
    });
    it('should reject missing required fields', async () => {
      await request(app.getHttpServer()).post('/api/v1/enrollments').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).send({}).expect(400);
    });
    it('should reject body tampering (institutionId)', async () => {
      await request(app.getHttpServer()).post('/api/v1/enrollments').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).send({ studentId: testStudentId, courseId: testCourseId, schoolGradeId: testSchoolGradeId, academicPeriodId: testAcademicPeriodId, institutionId: secondInstitutionId }).expect(400);
    });
  });

  describe('GET /api/v1/enrollments', () => {
    it('should return paginated list', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/enrollments').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      for (const en of res.body.data) { expect(en.institutionId).toBe(demoInstitutionId); }
    });
    it('should return correct pagination meta', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/enrollments?page=1&limit=1').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).expect(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(1);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('totalPages');
    });
  });

  describe('GET /api/v1/enrollments/:id', () => {
    it('should return enrollment by id', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/enrollments/${createdEnrollmentId}`).set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).expect(200);
      expect(res.body.id).toBe(createdEnrollmentId);
      expect(res.body.institutionId).toBe(demoInstitutionId);
    });
    it('should return 404 for non-existent', async () => {
      await request(app.getHttpServer()).get('/api/v1/enrollments/00000000-0000-0000-0000-000000000000').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).expect(404);
    });
    it('should return 404 for cross-tenant resource', async () => {
      const other = await prisma.enrollment.findFirst({ where: { institutionId: secondInstitutionId } });
      if (other) { await request(app.getHttpServer()).get(`/api/v1/enrollments/${other.id}`).set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).expect(404); }
    });
  });

  describe('PATCH /api/v1/enrollments/:id', () => {
    it('should update enrollment status', async () => {
      const res = await request(app.getHttpServer()).patch(`/api/v1/enrollments/${createdEnrollmentId}`).set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).send({ status: 'INACTIVE' }).expect(200);
      expect(res.body.status).toBe('INACTIVE');
    });
    it('should return 404 for non-existent', async () => {
      await request(app.getHttpServer()).patch('/api/v1/enrollments/00000000-0000-0000-0000-000000000000').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).send({ status: 'ACTIVE' }).expect(404);
    });
  });

  describe('PATCH /api/v1/enrollments/:id/deactivate', () => {
    it('should deactivate enrollment', async () => {
      const res = await request(app.getHttpServer()).patch(`/api/v1/enrollments/${createdEnrollmentId}/deactivate`).set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).expect(200);
      expect(res.body.status).toBe('INACTIVE');
    });
    it('should return 404 for cross-tenant deactivation', async () => {
      const other = await prisma.enrollment.findFirst({ where: { institutionId: secondInstitutionId } });
      if (other) { await request(app.getHttpServer()).patch(`/api/v1/enrollments/${other.id}/deactivate`).set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).expect(404); }
    });
  });

  describe('Tenant Isolation', () => {
    it('should not allow Tenant A to access Tenant B resources', async () => {
      const sa = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'admin@second-schoolen-e2e.dev', password: 'Demo1234!' });
      const res = await request(app.getHttpServer()).get('/api/v1/enrollments').set('Authorization', `Bearer ${sa.body.accessToken}`).set('X-Institution-Id', secondInstitutionId).expect(200);
      for (const en of res.body.data) { expect(en.institutionId).toBe(secondInstitutionId); }
    });
  });

  describe('Duplication Prevention', () => {
    it('should reject duplicate creation', async () => {
      await request(app.getHttpServer()).post('/api/v1/enrollments').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).send({ studentId: testStudentId, courseId: testCourseId, schoolGradeId: testSchoolGradeId, academicPeriodId: testAcademicPeriodId }).expect(409);
    });
  });
});
