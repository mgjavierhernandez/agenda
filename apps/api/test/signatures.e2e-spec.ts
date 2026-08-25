/* eslint-disable @typescript-eslint/no-explicit-any */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('Signatures Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;

  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let secondAdminToken: string;

  let createdRequestId: string;
  let teacherUserId: string;
  let parentUserId: string;

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

    const demoInstitution = await prisma.institution.findUnique({ where: { slug: 'demo-school' } });
    demoInstitutionId = demoInstitution!.id;

    const secondInstitution = await prisma.institution.create({
      data: { name: 'Second School Sig', slug: 'second-school-sig-e2e', status: 'ACTIVE' },
    });
    secondInstitutionId = secondInstitution.id;

    const secondAdminRole = await prisma.role.create({
      data: { name: 'INSTITUTION_ADMIN', roleType: 'TENANT', institutionId: secondInstitutionId },
    });
    const allPerms = await prisma.permission.findMany();
    for (const perm of allPerms) {
      await prisma.rolePermission.create({ data: { roleId: secondAdminRole.id, permissionId: perm.id } });
    }

    const secondAdmin = await prisma.user.create({
      data: { email: 'admin@second-sig-e2e.dev', passwordHash: VALID_PASSWORD_HASH, firstName: 'Second', lastName: 'Admin', status: 'ACTIVE' },
    });
    const secondAdminMem = await prisma.userInstitution.create({
      data: { userId: secondAdmin.id, institutionId: secondInstitutionId, status: MembershipStatus.ACTIVE },
    });
    await prisma.userRole.create({
      data: { userInstitutionId: secondAdminMem.id, roleId: secondAdminRole.id, institutionId: secondInstitutionId },
    });

    const login = async (email: string) => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password: 'Demo1234!' });
      return res.body.accessToken;
    };

    adminToken = await login('admin@demo-school.dev');
    teacherToken = await login('teacher@demo-school.dev');
    parentToken = await login('parent@demo-school.dev');
    secondAdminToken = await login('admin@second-sig-e2e.dev');

    const teacher = await prisma.user.findUnique({ where: { email: 'teacher@demo-school.dev' } });
    const parent = await prisma.user.findUnique({ where: { email: 'parent@demo-school.dev' } });
    teacherUserId = teacher!.id;
    parentUserId = parent!.id;

    await prisma.signatureRecipient.deleteMany({ where: { signatureRequest: { institutionId: demoInstitutionId } } });
    await prisma.signatureRequest.deleteMany({ where: { institutionId: demoInstitutionId } });
  }, 30_000);

  afterAll(async () => {
    if (secondInstitutionId) {
      await prisma.rolePermission.deleteMany({ where: { role: { institutionId: secondInstitutionId } } });
      await prisma.userRole.deleteMany({ where: { institutionId: secondInstitutionId } });
      await prisma.userInstitution.deleteMany({ where: { institutionId: secondInstitutionId } });
      await prisma.role.deleteMany({ where: { institutionId: secondInstitutionId } });
      await prisma.user.deleteMany({ where: { email: 'admin@second-sig-e2e.dev' } });
      await prisma.institution.delete({ where: { id: secondInstitutionId } });
    }
    await prisma.signatureRecipient.deleteMany({ where: { signatureRequest: { institutionId: demoInstitutionId } } });
    await prisma.signatureRequest.deleteMany({ where: { institutionId: demoInstitutionId } });

    await app.close();
    await prisma.$disconnect();
  });

  const instHeader = (token: string) => ({ Authorization: `Bearer ${token}`, 'X-Institution-Id': demoInstitutionId });
  const secondInstHeader = (token: string) => ({ Authorization: `Bearer ${token}`, 'X-Institution-Id': secondInstitutionId });

  describe('POST /api/v1/signature-requests', () => {
    it('should create a signature request with recipients as INSTITUTION_ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/signature-requests')
        .set(instHeader(adminToken))
        .send({ title: 'Test Auth Request', recipientUserIds: [teacherUserId, parentUserId] });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.recipients).toHaveLength(2);
      createdRequestId = res.body.id;
    });

    it('should create a request with future dueDate', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const res = await request(app.getHttpServer())
        .post('/api/v1/signature-requests')
        .set(instHeader(adminToken))
        .send({
          title: 'Request with due date',
          recipientUserIds: [teacherUserId],
          dueDate: futureDate.toISOString(),
        });
      expect(res.status).toBe(201);
      expect(res.body.dueDate).not.toBeNull();
    });

    it('should reject title shorter than 3 chars', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/signature-requests')
        .set(instHeader(adminToken))
        .send({ title: 'AB', recipientUserIds: [teacherUserId] });
      expect(res.status).toBe(400);
    });

    it('should reject empty recipientUserIds', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/signature-requests')
        .set(instHeader(adminToken))
        .send({ title: 'No Recipients', recipientUserIds: [] });
      expect(res.status).toBe(400);
    });

    it('should reject duplicate recipient user IDs', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/signature-requests')
        .set(instHeader(adminToken))
        .send({ title: 'Dups', recipientUserIds: [teacherUserId, teacherUserId] });
      expect(res.status).toBe(400);
    });

    it('should reject recipient not in institution', async () => {
      const outsideUser = await prisma.user.create({
        data: { email: `outside-sig-e2e-${Date.now()}@test.com`, passwordHash: VALID_PASSWORD_HASH, firstName: 'Out', lastName: 'Side', status: 'ACTIVE' },
      });
      const res = await request(app.getHttpServer())
        .post('/api/v1/signature-requests')
        .set(instHeader(adminToken))
        .send({ title: 'Outside User', recipientUserIds: [outsideUser.id] });
      expect(res.status).toBe(400);
      await prisma.userInstitution.deleteMany({ where: { userId: outsideUser.id } });
      await prisma.user.delete({ where: { id: outsideUser.id } });
    });

    it('should reject if institutionId in body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/signature-requests')
        .set(instHeader(adminToken))
        .send({ title: 'Hacked Title', recipientUserIds: [teacherUserId], institutionId: 'wrong-id' });
      expect(res.status).toBe(400);
    });

    it('should reject unauthorized request without token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/signature-requests')
        .set({ 'X-Institution-Id': demoInstitutionId })
        .send({ title: 'No Auth', recipientUserIds: [teacherUserId] });
      expect(res.status).toBe(401);
    });

    it('should reject teacher without signatures:request permission', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/signature-requests')
        .set(instHeader(teacherToken))
        .send({ title: 'Teacher Create', recipientUserIds: [parentUserId] });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/signature-requests', () => {
    it('should list requests for admin (manager)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/signature-requests')
        .set(instHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].recipients).toBeDefined();
    });

    it('should list requests for teacher as non-manager', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/signature-requests')
        .set(instHeader(teacherToken));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/signature-requests?page=1&limit=1')
        .set(instHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
      expect(res.body.meta.page).toBe(1);
    });

    it('should support status filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/signature-requests?status=DRAFT')
        .set(instHeader(adminToken));
      expect(res.status).toBe(200);
      res.body.data.forEach((r: Record<string, unknown>) => expect(r.status).toBe('DRAFT'));
    });

    it('should reject unauthorized access', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/signature-requests')
        .set({ 'X-Institution-Id': demoInstitutionId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/signature-requests/:id', () => {
    it('should get a request by id for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/signature-requests/${createdRequestId}`)
        .set(instHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdRequestId);
      expect(res.body.recipients).toBeDefined();
    });

    it('should return 404 for non-existent request', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/signature-requests/00000000-0000-0000-0000-000000000000')
        .set(instHeader(adminToken));
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/signature-requests/:id', () => {
    it('should update a DRAFT request', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/signature-requests/${createdRequestId}`)
        .set(instHeader(adminToken))
        .send({ title: 'Updated Auth Request' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Auth Request');
    });

    it('should reject update with invalid title', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/signature-requests/${createdRequestId}`)
        .set(instHeader(adminToken))
        .send({ title: 'AB' });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/signature-requests/:id/publish', () => {
    it('should publish a DRAFT request', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/signature-requests/${createdRequestId}/publish`)
        .set(instHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PUBLISHED');
    });

    it('should reject publishing a PUBLISHED request', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/signature-requests/${createdRequestId}/publish`)
        .set(instHeader(adminToken));
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/signature-requests/:id/sign', () => {
    let signableRequestId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/signature-requests')
        .set(instHeader(adminToken))
        .send({ title: 'Signable Request', recipientUserIds: [parentUserId] });
      signableRequestId = res.body.id;
      await request(app.getHttpServer())
        .patch(`/api/v1/signature-requests/${signableRequestId}/publish`)
        .set(instHeader(adminToken));
    });

    it('should allow a recipient to sign', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/signature-requests/${signableRequestId}/sign`)
        .set(instHeader(parentToken));
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.recipients.some((r: any) => r.userId === parentUserId && r.status === 'SIGNED')).toBe(true);
    });

    it('should reject signing an already-signed request', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/signature-requests/${signableRequestId}/sign`)
        .set(instHeader(parentToken));
      expect(res.status).toBe(400);
    });

    it('should reject teacher without signatures:sign permission', async () => {
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/signature-requests')
        .set(instHeader(adminToken))
        .send({ title: 'Teacher Cant Sign', recipientUserIds: [teacherUserId] });
      const req2Id = res2.body.id;
      await request(app.getHttpServer())
        .patch(`/api/v1/signature-requests/${req2Id}/publish`)
        .set(instHeader(adminToken));

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/signature-requests/${req2Id}/sign`)
        .set(instHeader(teacherToken));
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/signature-requests/:id/decline', () => {
    let declineableRequestId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/signature-requests')
        .set(instHeader(adminToken))
        .send({ title: 'Declinable Request', recipientUserIds: [parentUserId] });
      declineableRequestId = res.body.id;
      await request(app.getHttpServer())
        .patch(`/api/v1/signature-requests/${declineableRequestId}/publish`)
        .set(instHeader(adminToken));
    });

    it('should allow a recipient to decline', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/signature-requests/${declineableRequestId}/decline`)
        .set(instHeader(parentToken));
      expect(res.status).toBe(200);
      expect(res.body.recipients.some((r: any) => r.userId === parentUserId && r.status === 'DECLINED')).toBe(true);
    });

    it('should reject declining an already-declined request', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/signature-requests/${declineableRequestId}/decline`)
        .set(instHeader(parentToken));
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/signature-requests/:id/deactivate', () => {
    let deactivateableRequestId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/signature-requests')
        .set(instHeader(adminToken))
        .send({ title: 'Deactivatable Request', recipientUserIds: [teacherUserId] });
      deactivateableRequestId = res.body.id;
    });

    it('should deactivate a DRAFT request', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/signature-requests/${deactivateableRequestId}/deactivate`)
        .set(instHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('INACTIVE');
    });

    it('should return same status for already INACTIVE request', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/signature-requests/${deactivateableRequestId}/deactivate`)
        .set(instHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('INACTIVE');
    });
  });

  describe('Cross-tenant IDOR', () => {
    it('should return 404 when accessing request from another institution', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/signature-requests/${createdRequestId}`)
        .set(secondInstHeader(secondAdminToken));
      expect(res.status).toBe(404);
    });

    it('should not list requests from another institution', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/signature-requests')
        .set(secondInstHeader(secondAdminToken));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });
});
