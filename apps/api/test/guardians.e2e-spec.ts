import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('Guardians Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;
  let adminToken: string;
  let testStudentId: string;
  let secondAdminToken: string;
  let secondStudentId: string;

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
      data: { name: 'Second School GU', slug: 'second-schoolgu-e2e', status: 'ACTIVE' },
    });
    secondInstitutionId = secondInstitution.id;
    const secondAdminRole = await prisma.role.create({
      data: { name: 'INSTITUTION_ADMIN', roleType: 'TENANT', institutionId: secondInstitutionId },
    });
    const secondTeacherRole = await prisma.role.create({
      data: { name: 'TEACHER', roleType: 'TENANT', institutionId: secondInstitutionId },
    });
    const allPermissions = await prisma.permission.findMany();
    for (const perm of allPermissions) {
      await prisma.rolePermission.create({
        data: { roleId: secondAdminRole.id, permissionId: perm.id },
      });
    }
    for (const perm of allPermissions) {
      await prisma.rolePermission.create({
        data: { roleId: secondTeacherRole.id, permissionId: perm.id },
      });
    }

    const secondAdmin = await prisma.user.create({
      data: {
        email: 'admin@second-schoolgu-e2e.dev',
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

    const secondTeacher = await prisma.user.create({
      data: {
        email: 'teacher@second-schoolgu-e2e.dev',
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

    const secondStudent = await prisma.student.create({
      data: {
        institutionId: secondInstitutionId,
        firstName: 'Second',
        lastName: 'Student',
        documentType: 'DNI',
        documentNumber: `SG${Date.now().toString().slice(-8)}`,
      },
    });
    secondStudentId = secondStudent.id;

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Demo1234!' });
      return res.body.accessToken;
    };
    adminToken = await login('admin@demo-school.dev');
    secondAdminToken = await login('admin@second-schoolgu-e2e.dev');

    const testStudent = await prisma.student.create({
      data: {
        institutionId: demoInstitutionId,
        firstName: 'Guardian',
        lastName: 'Test',
        documentType: 'DNI',
        documentNumber: `GU${Date.now().toString().slice(-8)}`,
      },
    });
    testStudentId = testStudent.id;
  }, 30000);

  afterAll(async () => {
    await prisma.guardianStudent.deleteMany({ where: { studentId: testStudentId } });
    await prisma.student.delete({ where: { id: testStudentId } }).catch(() => {});
    await prisma.guardianStudent.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.student.delete({ where: { id: secondStudentId } }).catch(() => {});
    await prisma.userRole.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.rolePermission.deleteMany({
      where: { role: { institutionId: secondInstitutionId } },
    });
    await prisma.userInstitution.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.role.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.institution.delete({ where: { id: secondInstitutionId } }).catch(() => {});
    await prisma.user
      .delete({ where: { email: 'teacher@second-schoolgu-e2e.dev' } })
      .catch(() => {});
    await prisma.user.delete({ where: { email: 'admin@second-schoolgu-e2e.dev' } }).catch(() => {});
    await app.close();
    await prisma.$disconnect();
  });

  describe('Authentication', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/guardians/students')
        .set('X-Institution-Id', demoInstitutionId)
        .expect(401);
    });
  });

  describe('RBAC', () => {
    it('should return 403 for student without guardians:manage', async () => {
      const studentToken = await (async () => {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'student@demo-school.dev', password: 'Demo1234!' });
        return res.body.accessToken;
      })();
      await request(app.getHttpServer())
        .post(`/api/v1/guardians/students/${testStudentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ studentId: testStudentId, relationshipType: 'OTHER' })
        .expect(403);
    });
  });

  describe('POST /api/v1/guardians/students/:studentId', () => {
    it('should link guardian to student as parent', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/guardians/students/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ studentId: testStudentId, relationshipType: 'FATHER', isPrimary: true })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.relationshipType).toBe('FATHER');
      expect(res.body.isPrimary).toBe(true);
    });
    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/guardians/students/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({})
        .expect(400);
    });
    it('should reject duplicate guardian-student link', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/guardians/students/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ studentId: testStudentId, relationshipType: 'FATHER' })
        .expect(409);
    });
  });

  describe('GET /api/v1/guardians/students', () => {
    it('should return students linked to guardian (admin)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/guardians/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
    it('should return correct pagination meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/guardians/students?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('totalPages');
    });
  });

  describe('GET /api/v1/guardians/students/:studentId/guardians', () => {
    it('should return guardians for a student', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/guardians/students/${testStudentId}/guardians`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DELETE /api/v1/guardians/students/:studentId', () => {
    it('should unlink guardian from student', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/guardians/students/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      const res = await request(app.getHttpServer())
        .get('/api/v1/guardians/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      const linked = res.body.data.filter((s: { id: string }) => s.id === testStudentId);
      expect(linked.length).toBe(0);
    });
  });

  describe('Tenant Isolation', () => {
    it('should not allow Tenant A to access Tenant B resources', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/guardians/students')
        .set('Authorization', `Bearer ${secondAdminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);
      expect(res.body.data.length).toBe(0);
    });
  });
});
