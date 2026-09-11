import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';
const UNIQUE_CODE = `SG${Date.now().toString().slice(-6)}`;

describe('School Grades Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;
  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let createdSchoolGradeId: string;

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
      data: { name: 'Second School SG', slug: 'second-schoolsg-e2e', status: 'ACTIVE' },
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
        email: 'teacher@second-schoolsg-e2e.dev',
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
        email: 'admin@second-schoolsg-e2e.dev',
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
  }, 30000);

  afterAll(async () => {
    await prisma.userRole.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.rolePermission.deleteMany({
      where: { role: { institutionId: secondInstitutionId } },
    });
    await prisma.userInstitution.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.role.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.schoolGrade.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.institution.delete({ where: { id: secondInstitutionId } });
    await prisma.user.delete({ where: { email: 'teacher@second-schoolsg-e2e.dev' } });
    await prisma.user.delete({ where: { email: 'admin@second-schoolsg-e2e.dev' } });
    await app.close();
    await prisma.$disconnect();
  });

  describe('Authentication', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/school-grades')
        .set('X-Institution-Id', demoInstitutionId)
        .expect(401);
    });
  });

  describe('RBAC', () => {
    it('should return 403 for teacher without school-grades:manage', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/school-grades')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ name: 'T', code: 'TF' })
        .expect(403);
    });
    it('should return 403 for parent without school-grades:manage', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/school-grades/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ name: 'X' })
        .expect(403);
    });
  });

  describe('POST /api/v1/school-grades', () => {
    it('should create school grade as admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/school-grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ name: 'E2E Grade', code: UNIQUE_CODE, sortOrder: 10 })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.institutionId).toBe(demoInstitutionId);
      expect(res.body.name).toBe('E2E Grade');
      createdSchoolGradeId = res.body.id;
    });
    it('should reject duplicate code within same tenant', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/school-grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ name: 'Dup', code: UNIQUE_CODE })
        .expect(409);
    });
    it('should allow same code in different tenant', async () => {
      const sa = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@second-schoolsg-e2e.dev', password: 'Demo1234!' });
      await request(app.getHttpServer())
        .post('/api/v1/school-grades')
        .set('Authorization', `Bearer ${sa.body.accessToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .send({ name: 'Cross', code: UNIQUE_CODE })
        .expect(201);
    });
    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/school-grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({})
        .expect(400);
    });
    it('should reject body tampering (institutionId)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/school-grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ name: 'B', code: 'BBF', institutionId: secondInstitutionId })
        .expect(400);
    });
  });

  describe('GET /api/v1/school-grades', () => {
    it('should return paginated list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/school-grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(6);
      for (const sg of res.body.data) {
        expect(sg.institutionId).toBe(demoInstitutionId);
      }
    });
    it('should return 200 for teacher with school-grades:read', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/school-grades')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
    });
    it('should return 200 for parent with school-grades:read', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/school-grades')
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
    });
    it('should apply search filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/school-grades?search=Preescolar')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      for (const sg of res.body.data) {
        expect(sg.institutionId).toBe(demoInstitutionId);
      }
    });
    it('should return correct pagination meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/school-grades?page=1&limit=2')
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

  describe('GET /api/v1/school-grades/:id', () => {
    it('should return school grade by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/school-grades/${createdSchoolGradeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.id).toBe(createdSchoolGradeId);
      expect(res.body.institutionId).toBe(demoInstitutionId);
    });
    it('should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/school-grades/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });
    it('should return 404 for cross-tenant resource', async () => {
      const other = await prisma.schoolGrade.findFirst({
        where: { institutionId: secondInstitutionId },
      });
      if (other) {
        await request(app.getHttpServer())
          .get(`/api/v1/school-grades/${other.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(404);
      }
    });
  });

  describe('PATCH /api/v1/school-grades/:id', () => {
    it('should update school grade', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/school-grades/${createdSchoolGradeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ name: 'E2E Updated' })
        .expect(200);
      expect(res.body.name).toBe('E2E Updated');
    });
    it('should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/school-grades/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ name: 'F' })
        .expect(404);
    });
  });

  describe('PATCH /api/v1/school-grades/:id/deactivate', () => {
    it('should deactivate school grade', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/school-grades/${createdSchoolGradeId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.status).toBe('INACTIVE');
    });
    it('should return 404 for cross-tenant deactivation', async () => {
      const other = await prisma.schoolGrade.findFirst({
        where: { institutionId: secondInstitutionId },
      });
      if (other) {
        await request(app.getHttpServer())
          .patch(`/api/v1/school-grades/${other.id}/deactivate`)
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
        .send({ email: 'admin@second-schoolsg-e2e.dev', password: 'Demo1234!' });
      const res = await request(app.getHttpServer())
        .get('/api/v1/school-grades')
        .set('Authorization', `Bearer ${sa.body.accessToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);
      for (const sg of res.body.data) {
        expect(sg.institutionId).toBe(secondInstitutionId);
      }
    });
  });

  describe('Duplication Prevention', () => {
    it('should reject duplicate creation', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/school-grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ name: 'Dup2', code: UNIQUE_CODE })
        .expect(409);
    });
  });
});
