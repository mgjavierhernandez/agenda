import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('Agenda Events Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;

  let demoAdminToken: string;
  let demoTeacherToken: string;

  // demo institution fixtures
  let demoEventId: string;
  let demoTeacherEventId: string;

  // second tenant fixtures + tokens
  let secAdminToken: string;
  let secTeacherToken: string;
  let secParentToken: string;
  let secStudentToken: string;
  let secStudentId: string;
  let secTeachersOnlyEventId: string;
  let secAdminEventId: string;

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

    const demoInstitution = await prisma.institution.findUnique({
      where: { slug: 'demo-school' },
    });
    demoInstitutionId = demoInstitution!.id;

    // ---- second tenant fixtures ----
    const secondInstitution = await prisma.institution.create({
      data: { name: 'Second School EVT', slug: 'second-schoolevt-e2e', status: 'ACTIVE' },
    });
    secondInstitutionId = secondInstitution.id;

    const secAdminRole = await prisma.role.create({ data: { name: 'INSTITUTION_ADMIN', roleType: 'TENANT', institutionId: secondInstitutionId } });
    const secTeacherRole = await prisma.role.create({ data: { name: 'TEACHER', roleType: 'TENANT', institutionId: secondInstitutionId } });
    const secStudentRole = await prisma.role.create({ data: { name: 'STUDENT', roleType: 'TENANT', institutionId: secondInstitutionId } });
    const secParentRole = await prisma.role.create({ data: { name: 'PARENT', roleType: 'TENANT', institutionId: secondInstitutionId } });
    const allPermissions = await prisma.permission.findMany();
    for (const perm of allPermissions) {
      await prisma.rolePermission.create({ data: { roleId: secAdminRole.id, permissionId: perm.id } });
    }
    const agendaPerms = await prisma.permission.findMany({ where: { code: { startsWith: 'agenda:' } } });
    for (const perm of agendaPerms) {
      if (['agenda:read', 'agenda:create', 'agenda:update'].includes(perm.code)) {
        await prisma.rolePermission.create({ data: { roleId: secTeacherRole.id, permissionId: perm.id } });
      }
      if (['agenda:read'].includes(perm.code)) {
        await prisma.rolePermission.create({ data: { roleId: secParentRole.id, permissionId: perm.id } });
        await prisma.rolePermission.create({ data: { roleId: secStudentRole.id, permissionId: perm.id } });
      }
    }

    const mkUser = async (email: string, roleId: string) => {
      const u = await prisma.user.create({ data: { email, passwordHash: VALID_PASSWORD_HASH, firstName: 'Second', lastName: email.split('@')[0], status: 'ACTIVE' } });
      const mem = await prisma.userInstitution.create({ data: { userId: u.id, institutionId: secondInstitutionId, status: MembershipStatus.ACTIVE } });
      await prisma.userRole.create({ data: { userInstitutionId: mem.id, roleId, institutionId: secondInstitutionId } });
      return u;
    };
    const secAdminUser = await mkUser('admin@second-schoolevt-e2e.dev', secAdminRole.id);
    await mkUser('teacher@second-schoolevt-e2e.dev', secTeacherRole.id);
    const secParentUser = await mkUser('parent@second-schoolevt-e2e.dev', secParentRole.id);
    const secStudentUser = await mkUser('student@second-schoolevt-e2e.dev', secStudentRole.id);

    const secStudent = await prisma.student.create({ data: { institutionId: secondInstitutionId, userId: secStudentUser.id, firstName: 'Enrolled', lastName: 'Student', documentType: 'DNI', documentNumber: 'EV' + Date.now().toString().slice(-8), status: 'ACTIVE' } });
    secStudentId = secStudent.id;
    await prisma.guardianStudent.create({ data: { institutionId: secondInstitutionId, guardianUserId: secParentUser.id, studentId: secStudentId, relationshipType: 'FATHER', isPrimary: true, status: 'ACTIVE' } });

    const secAdminEvent = await prisma.agendaEvent.create({
      data: { institutionId: secondInstitutionId, createdById: secAdminUser.id, title: 'Sec Admin ALL Event', startAt: new Date('2026-09-10T10:00:00.000Z'), endAt: new Date('2026-09-10T11:00:00.000Z'), audience: 'ALL' },
    });
    secAdminEventId = secAdminEvent.id;

    const login = async (email: string) => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password: 'Demo1234!' });
      return res.body.accessToken;
    };
    demoAdminToken = await login('admin@demo-school.dev');
    demoTeacherToken = await login('teacher@demo-school.dev');
    secAdminToken = await login('admin@second-schoolevt-e2e.dev');
    secTeacherToken = await login('teacher@second-schoolevt-e2e.dev');
    secParentToken = await login('parent@second-schoolevt-e2e.dev');
    secStudentToken = await login('student@second-schoolevt-e2e.dev');
  }, 60000);

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityType: 'AgendaEvent', OR: [{ institutionId: demoInstitutionId }, { institutionId: secondInstitutionId }] } }).catch(() => {});
    await prisma.agendaEvent.deleteMany({ where: { institutionId: demoInstitutionId } }).catch(() => {});
    await prisma.agendaEvent.deleteMany({ where: { institutionId: secondInstitutionId } }).catch(() => {});
    await prisma.guardianStudent.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.userRole.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.rolePermission.deleteMany({ where: { role: { institutionId: secondInstitutionId } } });
    await prisma.userInstitution.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.role.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.student.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.institution.delete({ where: { id: secondInstitutionId } });
    for (const email of [
      'admin@second-schoolevt-e2e.dev',
      'teacher@second-schoolevt-e2e.dev',
      'parent@second-schoolevt-e2e.dev',
      'student@second-schoolevt-e2e.dev',
    ]) {
      await prisma.user.delete({ where: { email } }).catch(() => {});
    }
    await app.close();
    await prisma.$disconnect();
  });

  describe('Authentication', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer()).get('/api/v1/agenda/events').set('X-Institution-Id', demoInstitutionId).expect(401);
    });
  });

  describe('POST /api/v1/agenda/events', () => {
    it('should create an event as admin (201) and write the audit log', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/agenda/events')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'Reunion de padres', description: 'Convocatoria general', startAt: '2026-09-10T14:00:00.000Z', endAt: '2026-09-10T16:00:00.000Z', location: 'Salon de actos', audience: 'ALL' })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.institutionId).toBe(demoInstitutionId);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.audience).toBe('ALL');
      demoEventId = res.body.id;

      const auditCount = await prisma.auditLog.count({
        where: { entityType: 'AgendaEvent', entityId: demoEventId, action: 'EVENT_CREATED' },
      });
      expect(auditCount).toBe(1);
    });

    it('should create an event as teacher (has agenda:create) (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/agenda/events')
        .set('Authorization', `Bearer ${demoTeacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'Taller de padres', startAt: '2026-09-11T09:00:00.000Z', endAt: '2026-09-11T11:00:00.000Z', audience: 'TEACHERS' })
        .expect(201);
      expect(res.body.status).toBe('ACTIVE');
      demoTeacherEventId = res.body.id;
    });

    it('should apply the default audience (ALL) when omitted', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/agenda/events')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'Sin audiencia', startAt: '2026-09-12T09:00:00.000Z', endAt: '2026-09-12T10:00:00.000Z' })
        .expect(201);
      expect(res.body.audience).toBe('ALL');
    });

    it('should return 403 for PARENT and STUDENT (no agenda:create)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/agenda/events')
        .set('Authorization', `Bearer ${secParentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .send({ title: 'X', startAt: '2026-09-10T14:00:00.000Z', endAt: '2026-09-10T15:00:00.000Z' })
        .expect(403);
      await request(app.getHttpServer())
        .post('/api/v1/agenda/events')
        .set('Authorization', `Bearer ${secStudentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .send({ title: 'X', startAt: '2026-09-10T14:00:00.000Z', endAt: '2026-09-10T15:00:00.000Z' })
        .expect(403);
    });

    it('should reject body tampering (institutionId) with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/agenda/events')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'X', startAt: '2026-09-10T14:00:00.000Z', endAt: '2026-09-10T15:00:00.000Z', institutionId: secondInstitutionId })
        .expect(400);
    });

    it('should reject body tampering (createdById) with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/agenda/events')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'X', startAt: '2026-09-10T14:00:00.000Z', endAt: '2026-09-10T15:00:00.000Z', createdById: '00000000-0000-0000-0000-000000000000' })
        .expect(400);
    });

    it('should reject body tampering (status) with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/agenda/events')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'X', startAt: '2026-09-10T14:00:00.000Z', endAt: '2026-09-10T15:00:00.000Z', status: 'CANCELLED' })
        .expect(400);
    });

    it('should reject missing required fields with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/agenda/events')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({})
        .expect(400);
    });

    it('should reject endAt before startAt with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/agenda/events')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'X', startAt: '2026-09-10T16:00:00.000Z', endAt: '2026-09-10T14:00:00.000Z' })
        .expect(400);
    });
  });

  describe('GET /api/v1/agenda/events', () => {
    it('should return a paginated list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/agenda/events')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const e of res.body.data) expect(e.institutionId).toBe(demoInstitutionId);
    });

    it('should filter by status, audience and search', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/agenda/events?status=ACTIVE&audience=ALL&search=padres`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      for (const e of res.body.data) {
        expect(e.status).toBe('ACTIVE');
        expect(e.audience).toBe('ALL');
      }
    });

    it('should filter by date range', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/agenda/events?start=2026-09-10T00:00:00.000Z&end=2026-09-10T23:59:59.000Z')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject reversed date range with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/agenda/events?start=2026-10-01T00:00:00.000Z&end=2026-09-01T00:00:00.000Z')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(400);
    });

    it('should only expose ALL/STUDENTS events to a STUDENT', async () => {
      await prisma.agendaEvent.create({
        data: { institutionId: secondInstitutionId, createdById: (await prisma.user.findUnique({ where: { email: 'admin@second-schoolevt-e2e.dev' } }))!.id, title: 'Sec Students-Only Event', startAt: new Date('2026-09-13T10:00:00.000Z'), endAt: new Date('2026-09-13T11:00:00.000Z'), audience: 'STUDENTS' },
      });
      const res = await request(app.getHttpServer())
        .get('/api/v1/agenda/events')
        .set('Authorization', `Bearer ${secStudentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);
      for (const e of res.body.data) {
        expect(['ALL', 'STUDENTS']).toContain(e.audience);
      }
    });

    it('should only expose ALL/PARENTS events to a PARENT', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/agenda/events')
        .set('Authorization', `Bearer ${secParentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);
      for (const e of res.body.data) {
        expect(['ALL', 'PARENTS']).toContain(e.audience);
      }
    });

    it('should include ALL and TEACHERS events for a TEACHER', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/agenda/events')
        .set('Authorization', `Bearer ${secTeacherToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);
      for (const e of res.body.data) {
        expect(['ALL', 'TEACHERS']).toContain(e.audience);
      }
    });
  });

  describe('GET /api/v1/agenda/events/:id', () => {
    it('should return an event by id for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/agenda/events/${demoEventId}`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.id).toBe(demoEventId);
      expect(res.body.createdBy).toHaveProperty('firstName');
    });

    it('should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/agenda/events/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });

    it('should return 404 for cross-tenant resource access', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/agenda/events/${demoEventId}`)
        .set('Authorization', `Bearer ${secAdminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(404);
    });

    it('should hide TEACHERS-only events from a STUDENT (404)', async () => {
      const teachersOnly = await prisma.agendaEvent.create({
        data: { institutionId: secondInstitutionId, createdById: (await prisma.user.findUnique({ where: { email: 'admin@second-schoolevt-e2e.dev' } }))!.id, title: 'Sec Teachers-Only', startAt: new Date('2026-09-14T10:00:00.000Z'), endAt: new Date('2026-09-14T11:00:00.000Z'), audience: 'TEACHERS' },
      });
      secTeachersOnlyEventId = teachersOnly.id;

      await request(app.getHttpServer())
        .get(`/api/v1/agenda/events/${secTeachersOnlyEventId}`)
        .set('Authorization', `Bearer ${secStudentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/api/v1/agenda/events/${secTeachersOnlyEventId}`)
        .set('Authorization', `Bearer ${secParentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/api/v1/agenda/events/${secTeachersOnlyEventId}`)
        .set('Authorization', `Bearer ${secAdminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);
    });

    it('should allow a STUDENT to read their own ALL event', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/agenda/events/${secAdminEventId}`)
        .set('Authorization', `Bearer ${secStudentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);
    });
  });

  describe('PATCH /api/v1/agenda/events/:id', () => {
    it('should update title/location/audience as admin (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/agenda/events/${demoEventId}`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'Reunion de padres (confirmada)', location: 'Aula Magna', audience: 'PARENTS' })
        .expect(200);
      expect(res.body.title).toBe('Reunion de padres (confirmada)');
      expect(res.body.location).toBe('Aula Magna');
      expect(res.body.audience).toBe('PARENTS');
      expect(res.body.institutionId).toBe(demoInstitutionId);
    });

    it('should allow a TEACHER to update an event (has agenda:update)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/agenda/events/${demoTeacherEventId}`)
        .set('Authorization', `Bearer ${demoTeacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ description: 'Actualizada por profesor' })
        .expect(200);
      expect(res.body.description).toBe('Actualizada por profesor');
    });

    it('should reject immutable field tampering (institutionId) with 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/agenda/events/${demoEventId}`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ institutionId: secondInstitutionId })
        .expect(400);
    });

    it('should return 403 for PARENT and STUDENT (no agenda:update)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/agenda/events/${secAdminEventId}`)
        .set('Authorization', `Bearer ${secParentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .send({ title: 'Hack' })
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/api/v1/agenda/events/${secAdminEventId}`)
        .set('Authorization', `Bearer ${secStudentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .send({ title: 'Hack' })
        .expect(403);
    });

    it('should return 404 for cross-tenant update', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/agenda/events/${demoEventId}`)
        .set('Authorization', `Bearer ${secAdminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .send({ title: 'X' })
        .expect(404);
    });

    it('should reject endAt before startAt with 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/agenda/events/${demoEventId}`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ startAt: '2026-09-10T20:00:00.000Z' })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/agenda/events/:id (soft cancel)', () => {
    it('should cancel an event as admin (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/agenda/events/${demoEventId}`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      expect(res.body.status).toBe('CANCELLED');

      const auditCount = await prisma.auditLog.count({
        where: { entityType: 'AgendaEvent', entityId: demoEventId, action: 'EVENT_CANCELLED' },
      });
      expect(auditCount).toBe(1);
    });

    it('should return 400 when cancelling an already cancelled event', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/agenda/events/${demoEventId}`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(400);
    });

    it('should reject updating a cancelled event with 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/agenda/events/${demoEventId}`)
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ title: 'Nope' })
        .expect(400);
    });

    it('should return 404 for non-existent', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/agenda/events/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });

    it('should return 403 for TEACHER (no agenda:delete)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/agenda/events/${demoTeacherEventId}`)
        .set('Authorization', `Bearer ${demoTeacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(403);
    });

    it('should return 403 for PARENT and STUDENT (no agenda:delete)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/agenda/events/${secAdminEventId}`)
        .set('Authorization', `Bearer ${secParentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(403);
      await request(app.getHttpServer())
        .delete(`/api/v1/agenda/events/${secAdminEventId}`)
        .set('Authorization', `Bearer ${secStudentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(403);
    });
  });

  describe('GET /api/v1/agenda (aggregation includes custom events)', () => {
    it('should return EVENT-type items for an admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/agenda?start=2026-09-01&end=2026-09-30')
        .set('Authorization', `Bearer ${demoAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);
      const eventItems = res.body.data.filter((e: { type: string }) => e.type === 'EVENT');
      expect(eventItems.length).toBeGreaterThan(0);
      for (const e of eventItems) {
        expect(e.sourceType).toBe('AgendaEvent');
        expect(e.route).toContain('/agenda/events/');
      }
    });

    it('should not include TEACHERS-only events for a STUDENT', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/agenda?start=2026-09-01&end=2026-09-30')
        .set('Authorization', `Bearer ${secStudentToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);
      const eventItems = res.body.data.filter(
        (e: { type: string; sourceType: string }) => e.type === 'EVENT' && e.sourceType === 'AgendaEvent',
      );
      for (const e of eventItems) {
        expect(e.id).not.toBe(`event-${secTeachersOnlyEventId}`);
      }
    });
  });
});