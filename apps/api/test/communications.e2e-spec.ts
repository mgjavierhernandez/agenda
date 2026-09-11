import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('Communications Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;

  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let studentToken: string;

  let createdCommunicationId: string;

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

    // Create second institution for cross-tenant tests
    const secondInstitution = await prisma.institution.create({
      data: {
        name: 'Second School Comms',
        slug: 'second-school-comms-e2e',
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
        email: 'admin@second-comms-e2e.dev',
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
    await prisma.communication.deleteMany({
      where: { institutionId: secondInstitutionId },
    });
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
    await prisma.institution.delete({ where: { id: secondInstitutionId } }).catch(() => {});
    await prisma.user.delete({ where: { email: 'admin@second-comms-e2e.dev' } }).catch(() => {});
    await app.close();
    await prisma.$disconnect();
  });

  describe('Authentication', () => {
    it('TEST-00: No token -> 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/communications')
        .set('X-Institution-Id', demoInstitutionId)
        .expect(401);
    });
  });

  describe('RBAC', () => {
    it('TEST-01: Student without communications:manage -> 403 on POST', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/communications')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Test Comm',
          content: 'Test content',
          audience: 'ALL',
        })
        .expect(403);
    });

    it('TEST-02: Parent without communications:manage -> 403 on POST', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/communications')
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Test Comm',
          content: 'Test content',
          audience: 'ALL',
        })
        .expect(403);
    });
  });

  describe('POST /api/v1/communications', () => {
    it('TEST-03: Admin creates communication -> 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/communications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Comunicado E2E',
          content: 'Contenido del comunicado para pruebas E2E.',
          audience: 'ALL',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.institutionId).toBe(demoInstitutionId);
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.publishedAt).toBeNull();
      createdCommunicationId = res.body.id;
    });

    it('TEST-04: Admin creates communication with expiresAt -> 201', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const res = await request(app.getHttpServer())
        .post('/api/v1/communications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Comunicado con expiración',
          content: 'Este comunicado expira.',
          audience: 'PARENTS',
          expiresAt: futureDate.toISOString(),
        })
        .expect(201);

      expect(res.body.expiresAt).not.toBeNull();
    });

    it('TEST-05: Validation - title too short -> 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/communications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'AB',
          content: 'Content',
          audience: 'ALL',
        })
        .expect(400);
    });

    it('TEST-06: Validation - missing audience -> 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/communications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Test Title',
          content: 'Content',
        })
        .expect(400);
    });

    it('TEST-07: Body tampering - institutionId in body is rejected by whitelist -> 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/communications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Body Tampering Test',
          content: 'Should use header institution',
          audience: 'ALL',
          institutionId: secondInstitutionId,
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/communications', () => {
    it('TEST-08: Admin lists all communications -> 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/communications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('limit');
      expect(res.body.meta).toHaveProperty('total');
    });

    it('TEST-09: Pagination works', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/communications?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
    });

    it('TEST-10: Search by title works', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/communications?search=E2E')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('TEST-11: Filter by audience works', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/communications?audience=PARENTS')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      for (const comm of res.body.data) {
        expect(comm.audience).toBe('PARENTS');
      }
    });

    it('TEST-12: Filter by status works', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/communications?status=DRAFT')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      for (const comm of res.body.data) {
        expect(comm.status).toBe('DRAFT');
      }
    });
  });

  describe('GET /api/v1/communications/:id', () => {
    it('TEST-13: Admin gets communication by ID -> 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/communications/${createdCommunicationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.id).toBe(createdCommunicationId);
      expect(res.body.institutionId).toBe(demoInstitutionId);
    });

    it('TEST-14: 404 for non-existent ID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/communications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/communications/:id', () => {
    it('TEST-15: Admin updates communication -> 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/communications/${createdCommunicationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'Comunicado Actualizado E2E' })
        .expect(200);

      expect(res.body.title).toBe('Comunicado Actualizado E2E');
    });
  });

  describe('PATCH /api/v1/communications/:id/publish', () => {
    it('TEST-16: Admin publishes DRAFT communication -> 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/communications/${createdCommunicationId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.status).toBe('PUBLISHED');
      expect(res.body.publishedAt).not.toBeNull();
    });

    it('TEST-17: Publishing already published -> 200 (idempotent)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/communications/${createdCommunicationId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.status).toBe('PUBLISHED');
    });
  });

  describe('Audience visibility for consumers', () => {
    let teacherOnlyCommId: string;
    let parentOnlyCommId: string;
    let studentOnlyCommId: string;
    let allAudienceCommId: string;

    beforeAll(async () => {
      const createComm = async (title: string, audience: string) => {
        const res = await request(app.getHttpServer())
          .post('/api/v1/communications')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .send({ title, content: `${title} content`, audience });
        return res.body.id;
      };

      teacherOnlyCommId = await createComm('Teachers Only E2E', 'TEACHERS');
      parentOnlyCommId = await createComm('Parents Only E2E', 'PARENTS');
      studentOnlyCommId = await createComm('Students Only E2E', 'STUDENTS');
      allAudienceCommId = await createComm('All Audience E2E', 'ALL');

      // Publish all
      for (const id of [
        teacherOnlyCommId,
        parentOnlyCommId,
        studentOnlyCommId,
        allAudienceCommId,
      ]) {
        await request(app.getHttpServer())
          .patch(`/api/v1/communications/${id}/publish`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', demoInstitutionId);
      }
    });

    it('TEST-18: Teacher can see TEACHERS and ALL communications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/communications')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      const ids = res.body.data.map((c: { id: string }) => c.id);
      expect(ids).toContain(allAudienceCommId);
      expect(ids).toContain(teacherOnlyCommId);
    });

    it('TEST-19: Parent can see PARENTS and ALL communications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/communications')
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      const ids = res.body.data.map((c: { id: string }) => c.id);
      expect(ids).toContain(allAudienceCommId);
      expect(ids).toContain(parentOnlyCommId);
    });

    it('TEST-20: Student can see STUDENTS and ALL communications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/communications')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      const ids = res.body.data.map((c: { id: string }) => c.id);
      expect(ids).toContain(allAudienceCommId);
      expect(ids).toContain(studentOnlyCommId);
    });

    it('TEST-21: Parent cannot see TEACHERS communication via GET/:id -> 404', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/communications/${teacherOnlyCommId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });

    it('TEST-22: Student cannot see PARENTS communication via GET/:id -> 404', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/communications/${parentOnlyCommId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });

    it('TEST-23: Teacher cannot see STUDENTS communication via GET/:id -> 404', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/communications/${studentOnlyCommId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });
  });

  describe('DRAFT visibility for consumers', () => {
    let draftCommId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/communications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          title: 'Draft for Consumer Test',
          content: 'This is a draft.',
          audience: 'ALL',
        });
      draftCommId = res.body.id;
    });

    it('TEST-24: Student cannot see DRAFT via list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/communications')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      const ids = res.body.data.map((c: { id: string }) => c.id);
      expect(ids).not.toContain(draftCommId);
    });

    it('TEST-25: Student cannot see DRAFT via GET/:id -> 404', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/communications/${draftCommId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });

    it('TEST-26: Admin CAN see DRAFT via list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/communications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      const ids = res.body.data.map((c: { id: string }) => c.id);
      expect(ids).toContain(draftCommId);
    });
  });

  describe('Tenant isolation', () => {
    it('TEST-27: Tenant A cannot read Tenant B communication -> 403 or 404', async () => {
      // Create in demo institution
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/communications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'Tenant A Comm', content: 'Content', audience: 'ALL' });
      const commId = createRes.body.id;

      // Try to read from second institution (admin has no membership there -> 403)
      const res = await request(app.getHttpServer())
        .get(`/api/v1/communications/${commId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', secondInstitutionId);
      expect([403, 404]).toContain(res.status);
    });

    it('TEST-28: Tenant A cannot update Tenant B communication -> 403 or 404', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/communications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'Tenant A Update', content: 'Content', audience: 'ALL' });
      const commId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/communications/${commId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .send({ title: 'Hacked' });
      expect([403, 404]).toContain(res.status);
    });

    it('TEST-29: Tenant A cannot publish Tenant B communication -> 403 or 404', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/communications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'Tenant A Publish', content: 'Content', audience: 'ALL' });
      const commId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/communications/${commId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', secondInstitutionId);
      expect([403, 404]).toContain(res.status);
    });

    it('TEST-30: Tenant A cannot deactivate Tenant B communication -> 403 or 404', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/communications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'Tenant A Deactivate', content: 'Content', audience: 'ALL' });
      const commId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/communications/${commId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', secondInstitutionId);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/communications/:id/deactivate', () => {
    let deactivateTestId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/communications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'Deactivate Test', content: 'To deactivate', audience: 'ALL' });
      deactivateTestId = res.body.id;
    });

    it('TEST-31: Admin deactivates communication -> 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/communications/${deactivateTestId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.status).toBe('INACTIVE');
    });

    it('TEST-32: Deactivating already inactive -> 200 (idempotent)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/communications/${deactivateTestId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.status).toBe('INACTIVE');
    });

    it('TEST-33: Cannot publish INACTIVE communication -> 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/communications/${deactivateTestId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(400);
    });
  });
});
