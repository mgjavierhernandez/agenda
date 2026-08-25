import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

const UNIQUE_DNI = `E2E${Date.now().toString().slice(-6)}01`;

describe('Students Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;

  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let studentToken: string;

  let createdStudentId: string;

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

    const secondInstitution = await prisma.institution.create({
      data: {
        name: 'Second School Students',
        slug: 'second-school-students-e2e',
        status: 'ACTIVE',
      },
    });
    secondInstitutionId = secondInstitution.id;

    const secondTeacherRole = await prisma.role.create({
      data: {
        name: 'TEACHER',
        roleType: 'TENANT',
        institutionId: secondInstitutionId,
      },
    });

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

    const secondTeacher = await prisma.user.create({
      data: {
        email: 'teacher@second-students-e2e.dev',
        passwordHash: VALID_PASSWORD_HASH,
        firstName: 'Second',
        lastName: 'Teacher',
        status: 'ACTIVE',
      },
    });

    const secondTeacherMembership = await prisma.userInstitution.create({
      data: {
        userId: secondTeacher.id,
        institutionId: secondInstitutionId,
        status: MembershipStatus.ACTIVE,
      },
    });

    await prisma.userRole.create({
      data: {
        userInstitutionId: secondTeacherMembership.id,
        roleId: secondTeacherRole.id,
        institutionId: secondInstitutionId,
      },
    });

    const secondAdmin = await prisma.user.create({
      data: {
        email: 'admin@second-students-e2e.dev',
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
    await prisma.student.deleteMany({
      where: { institutionId: secondInstitutionId },
    });
    await prisma.institution.delete({ where: { id: secondInstitutionId } });
    await prisma.user.delete({ where: { email: 'teacher@second-students-e2e.dev' } });
    await prisma.user.delete({ where: { email: 'admin@second-students-e2e.dev' } });
    await app.close();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/students', () => {
    it('TEST-01: Admin creates student → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          firstName: 'Carlos',
          lastName: 'Mendoza',
          documentType: 'DNI',
          documentNumber: UNIQUE_DNI,
          dateOfBirth: '2012-05-20',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.institutionId).toBe(demoInstitutionId);
      expect(res.body.firstName).toBe('Carlos');
      createdStudentId = res.body.id;
    });

    it('TEST-06: Teacher without students:create → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          firstName: 'Test',
          lastName: 'Teacher',
          documentType: 'DNI',
          documentNumber: '99999999',
        })
        .expect(403);
    });

    it('TEST-11: Body institutionId is rejected by forbidNonWhitelisted → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          firstName: 'Body',
          lastName: 'Bypass',
          documentType: 'DNI',
          documentNumber: '50111222',
          institutionId: secondInstitutionId,
        })
        .expect(400);
    });

    it('TEST-17: Duplicate document within same tenant → 409', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          firstName: 'Duplicate',
          lastName: 'Student',
          documentType: 'DNI',
          documentNumber: UNIQUE_DNI,
        })
        .expect(409);
    });

    it('TEST-18: Same document in different tenant → 201', async () => {
      const secondAdminLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@second-students-e2e.dev', password: 'Demo1234!' });

      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${secondAdminLogin.body.accessToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .send({
          firstName: 'Cross',
          lastName: 'Tenant',
          documentType: 'DNI',
          documentNumber: UNIQUE_DNI,
        })
        .expect(201);
    });

    it('should reject missing required fields → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v1/students', () => {
    it('TEST-03: Admin lists students → only current tenant', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);

      for (const student of res.body.data) {
        expect(student.institutionId).toBe(demoInstitutionId);
      }
    });

    it('TEST-04: Teacher with students:read → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('TEST-05: Parent with students:read → 200', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
    });

    it('TEST-12: Student without students:read → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(403);
    });

    it('TEST-19: Search returns only current tenant results', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/students?search=Lucía')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      for (const student of res.body.data) {
        expect(student.institutionId).toBe(demoInstitutionId);
      }
    });

    it('TEST-20: Pagination returns correct meta', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/students?page=1&limit=2')
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

  describe('GET /api/v1/students/:id', () => {
    it('TEST-02: Admin gets student by ID → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/students/${createdStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.id).toBe(createdStudentId);
      expect(res.body.institutionId).toBe(demoInstitutionId);
    });

    it('TEST-08: Admin gets student from other tenant → 404', async () => {
      const otherStudent = await prisma.student.findFirst({
        where: { institutionId: secondInstitutionId },
      });

      if (otherStudent) {
        await request(app.getHttpServer())
          .get(`/api/v1/students/${otherStudent.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(404);
      }
    });

    it('should return 404 for non-existent student', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/students/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/students/:id', () => {
    it('TEST-09: Admin updates student in current tenant → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/students/${createdStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ firstName: 'Carlos Updated' })
        .expect(200);

      expect(res.body.firstName).toBe('Carlos Updated');
    });

    it('TEST-07: Parent without students:update → 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/students/${createdStudentId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ firstName: 'Should Fail' })
        .expect(403);
    });

    it('TEST-09b: Admin updates student from other tenant → 404', async () => {
      const otherStudent = await prisma.student.findFirst({
        where: { institutionId: secondInstitutionId },
      });

      if (otherStudent) {
        await request(app.getHttpServer())
          .patch(`/api/v1/students/${otherStudent.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .send({ firstName: 'Should Not Work' })
          .expect(404);
      }
    });
  });

  describe('PATCH /api/v1/students/:id/deactivate', () => {
    it('TEST-10: Admin deactivates student in current tenant → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/students/${createdStudentId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.status).toBe('INACTIVE');
    });

    it('TEST-10b: Admin deactivates student from other tenant → 404', async () => {
      const otherStudent = await prisma.student.findFirst({
        where: { institutionId: secondInstitutionId },
      });

      if (otherStudent) {
        await request(app.getHttpServer())
          .patch(`/api/v1/students/${otherStudent.id}/deactivate`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(404);
      }
    });
  });

  describe('Authentication + Tenant guards', () => {
    it('TEST-13: Without access token → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('X-Institution-Id', demoInstitutionId)
        .expect(401);
    });

    it('TEST-14: Without X-Institution-Id → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('TEST-14b: Institution without membership → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(403);
    });

    it('TEST-15: Inactive membership → 403', async () => {
      const inactiveUser = await prisma.user.create({
        data: {
          email: 'inactive-student-e2e@demo.dev',
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
          .send({ email: 'inactive-student-e2e@demo.dev', password: 'Demo1234!' });

        await request(app.getHttpServer())
          .get('/api/v1/students')
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
          name: 'Inactive Students E2E',
          slug: 'inactive-students-e2e',
          status: 'INACTIVE',
        },
      });

      const user = await prisma.user.create({
        data: {
          email: 'inactive-inst-student-e2e@demo.dev',
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
          .send({ email: 'inactive-inst-student-e2e@demo.dev', password: 'Demo1234!' });

        await request(app.getHttpServer())
          .get('/api/v1/students')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .set('X-Institution-Id', inactiveInst.id)
          .expect(403);
      } finally {
        await prisma.userInstitution.delete({ where: { id: membership.id } });
        await prisma.user.delete({ where: { id: user.id } });
        await prisma.institution.delete({ where: { id: inactiveInst.id } });
      }
    });

    it('TEST-19b: Search is tenant-scoped', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/students?search=${UNIQUE_DNI}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      for (const student of res.body.data) {
        expect(student.institutionId).toBe(demoInstitutionId);
      }
    });

    it('TEST-21: Body institutionId cannot bypass tenant (rejected by forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          firstName: 'Bypass',
          lastName: 'Attempt',
          documentType: 'DNI',
          documentNumber: '60111222',
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

    it('TEST-22: SUPER_ADMIN with membership in A can operate in A', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('TEST-23: SUPER_ADMIN can access any institution (auto-creates membership)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);

      expect(res.body.data).toBeDefined();
    });
  });
});
