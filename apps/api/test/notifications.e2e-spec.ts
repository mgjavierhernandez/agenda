/* eslint-disable @typescript-eslint/no-explicit-any */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('Notifications Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;

  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let studentToken: string;
  let secondAdminToken: string;

  let teacherUserId: string;
  let parentUserId: string;
  let studentUserId: string;

  let createdNotificationId: string;

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
      data: { name: 'Second School Notif', slug: 'second-school-notif-e2e', status: 'ACTIVE' },
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
      data: { email: 'admin@second-notif-e2e.dev', passwordHash: VALID_PASSWORD_HASH, firstName: 'Second', lastName: 'Admin', status: 'ACTIVE' },
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
    studentToken = await login('student@demo-school.dev');
    secondAdminToken = await login('admin@second-notif-e2e.dev');

    const teacher = await prisma.user.findUnique({ where: { email: 'teacher@demo-school.dev' } });
    const parent = await prisma.user.findUnique({ where: { email: 'parent@demo-school.dev' } });
    const student = await prisma.user.findUnique({ where: { email: 'student@demo-school.dev' } });
    teacherUserId = teacher!.id;
    parentUserId = parent!.id;
    studentUserId = student!.id;

    await prisma.notification.deleteMany({ where: { institutionId: demoInstitutionId } });
  }, 30_000);

  afterAll(async () => {
    if (secondInstitutionId) {
      await prisma.rolePermission.deleteMany({ where: { role: { institutionId: secondInstitutionId } } });
      await prisma.userRole.deleteMany({ where: { institutionId: secondInstitutionId } });
      await prisma.userInstitution.deleteMany({ where: { institutionId: secondInstitutionId } });
      await prisma.role.deleteMany({ where: { institutionId: secondInstitutionId } });
      await prisma.user.deleteMany({ where: { email: 'admin@second-notif-e2e.dev' } });
      await prisma.institution.delete({ where: { id: secondInstitutionId } });
    }
    await prisma.notification.deleteMany({ where: { institutionId: demoInstitutionId } });

    await app.close();
    await prisma.$disconnect();
  });

  const instHeader = (token: string) => ({ Authorization: `Bearer ${token}`, 'X-Institution-Id': demoInstitutionId });
  const secondInstHeader = (token: string) => ({ Authorization: `Bearer ${token}`, 'X-Institution-Id': secondInstitutionId });

  describe('POST /api/v1/notifications', () => {
    it('should create a notification as INSTITUTION_ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(instHeader(adminToken))
        .send({
          type: 'SIGNATURE_REQUEST',
          title: 'New signature request',
          message: 'You have a new signature request.',
          userId: parentUserId,
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('UNREAD');
      expect(res.body.type).toBe('SIGNATURE_REQUEST');
      createdNotificationId = res.body.id;
    });

    it('should create notification with entityType/entityId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(instHeader(adminToken))
        .send({
          type: 'COMMUNICATION',
          title: 'New communication',
          message: 'A new communication was published.',
          userId: teacherUserId,
          entityType: 'Communication',
          entityId: 'some-uuid',
        });
      expect(res.status).toBe(201);
      expect(res.body.entityType).toBe('Communication');
    });

    it('should reject if target user is not in institution', async () => {
      const outsideUser = await prisma.user.create({
        data: { email: `outside-notif-e2e-${Date.now()}@test.com`, passwordHash: VALID_PASSWORD_HASH, firstName: 'Out', lastName: 'Side', status: 'ACTIVE' },
      });
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(instHeader(adminToken))
        .send({
          type: 'GENERAL',
          title: 'Outside',
          message: 'To outside user',
          userId: outsideUser.id,
        });
      expect(res.status).toBe(400);
      await prisma.user.delete({ where: { id: outsideUser.id } });
    });

    it('should reject invalid type', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(instHeader(adminToken))
        .send({
          type: 'INVALID_TYPE',
          title: 'Bad type',
          message: 'Msg',
          userId: parentUserId,
        });
      expect(res.status).toBe(400);
    });

    it('should reject title shorter than 3 chars', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(instHeader(adminToken))
        .send({
          type: 'GENERAL',
          title: 'AB',
          message: 'Msg',
          userId: parentUserId,
        });
      expect(res.status).toBe(400);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(instHeader(adminToken))
        .send({});
      expect(res.status).toBe(400);
    });

    it('should reject if institutionId in body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(instHeader(adminToken))
        .send({
          type: 'GENERAL',
          title: 'Hacked',
          message: 'Msg',
          userId: parentUserId,
          institutionId: 'wrong-id',
        });
      expect(res.status).toBe(400);
    });

    it('should reject unauthorized request without token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set({ 'X-Institution-Id': demoInstitutionId })
        .send({ type: 'GENERAL', title: 'No Auth', message: 'Msg', userId: parentUserId });
      expect(res.status).toBe(401);
    });

    it('should reject teacher without notifications:manage permission', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(instHeader(teacherToken))
        .send({ type: 'GENERAL', title: 'Teacher Create', message: 'Msg', userId: parentUserId });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/notifications', () => {
    it('should list notifications for the current user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set(instHeader(parentToken));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
      expect(res.body.unreadCount).toBeGreaterThanOrEqual(0);
    });

    it('should only return notifications for the current user (not others)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set(instHeader(teacherToken));
      expect(res.status).toBe(200);
      res.body.data.forEach((n: any) => expect(n.userId).toBe(teacherUserId));
    });

    it('should support status filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications?status=UNREAD')
        .set(instHeader(parentToken));
      expect(res.status).toBe(200);
      res.body.data.forEach((n: any) => expect(n.status).toBe('UNREAD'));
    });

    it('should support type filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications?type=SIGNATURE_REQUEST')
        .set(instHeader(parentToken));
      expect(res.status).toBe(200);
      res.body.data.forEach((n: any) => expect(n.type).toBe('SIGNATURE_REQUEST'));
    });

    it('should support pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications?page=1&limit=1')
        .set(instHeader(parentToken));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
      expect(res.body.meta.page).toBe(1);
    });

    it('should support search', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications?search=signature')
        .set(instHeader(parentToken));
      expect(res.status).toBe(200);
    });

    it('should reject unauthorized access', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set({ 'X-Institution-Id': demoInstitutionId });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/notifications/:id', () => {
    it('should get a notification by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/notifications/${createdNotificationId}`)
        .set(instHeader(parentToken));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdNotificationId);
    });

    it('should return 404 for another user\'s notification', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/notifications/${createdNotificationId}`)
        .set(instHeader(teacherToken));
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent notification', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/00000000-0000-0000-0000-000000000000')
        .set(instHeader(parentToken));
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/notifications/:id', () => {
    it('should mark a notification as read', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${createdNotificationId}`)
        .set(instHeader(parentToken))
        .send({ status: 'READ' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('READ');
      expect(res.body.readAt).not.toBeNull();
    });

    it('should return same status if already read (idempotent)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/notifications/${createdNotificationId}`)
        .set(instHeader(parentToken))
        .send({ status: 'READ' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('READ');
    });
  });

  describe('PATCH /api/v1/notifications (mark all as read)', () => {
    it('should mark all unread notifications as read', async () => {
      // Create some unread notifications first
      await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(instHeader(adminToken))
        .send({ type: 'GENERAL', title: 'Unread 1', message: 'Msg 1', userId: parentUserId });
      await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(instHeader(adminToken))
        .send({ type: 'GENERAL', title: 'Unread 2', message: 'Msg 2', userId: parentUserId });

      const res = await request(app.getHttpServer())
        .patch('/api/v1/notifications')
        .set(instHeader(parentToken));
      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('DELETE /api/v1/notifications/:id', () => {
    it('should delete a notification', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(instHeader(adminToken))
        .send({ type: 'GENERAL', title: 'To Delete', message: 'Delete me', userId: parentUserId });
      const notifId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/notifications/${notifId}`)
        .set(instHeader(parentToken));
      expect(res.status).toBe(204);
    });

    it('should return 404 for non-existent notification', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/notifications/00000000-0000-0000-0000-000000000000')
        .set(instHeader(parentToken));
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/notifications (delete all)', () => {
    it('should delete all notifications for the current user', async () => {
      // Create some notifications first
      await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(instHeader(adminToken))
        .send({ type: 'GENERAL', title: 'Delete All 1', message: 'Msg', userId: studentUserId });
      await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(instHeader(adminToken))
        .send({ type: 'GENERAL', title: 'Delete All 2', message: 'Msg', userId: studentUserId });

      const res = await request(app.getHttpServer())
        .delete('/api/v1/notifications')
        .set(instHeader(studentToken));
      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(2);

      // Verify they're gone
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set(instHeader(studentToken));
      expect(listRes.body.data).toHaveLength(0);
    });
  });

  describe('Cross-tenant IDOR', () => {
    it('should return 404 when accessing notification from another institution', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/notifications/${createdNotificationId}`)
        .set(secondInstHeader(secondAdminToken));
      expect(res.status).toBe(404);
    });

    it('should not list notifications from another institution', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set(secondInstHeader(secondAdminToken));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('Visibility isolation', () => {
    it('should not allow user to see another user\'s notification via list', async () => {
      // Create notification for teacher
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/notifications')
        .set(instHeader(adminToken))
        .send({ type: 'GENERAL', title: 'Teacher Only', message: 'For teacher', userId: teacherUserId });
      const teacherNotifId = createRes.body.id;

      // Parent should not see it
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set(instHeader(parentToken));
      const ids = listRes.body.data.map((n: any) => n.id);
      expect(ids).not.toContain(teacherNotifId);
    });
  });
});
