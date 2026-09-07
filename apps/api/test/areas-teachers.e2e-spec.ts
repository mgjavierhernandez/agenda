import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('Areas + Teachers academic relations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;
  let adminToken: string;
  let parentToken: string;
  let createdAreaId: string;

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
    const secondInstitution = await prisma.institution.create({ data: { name: 'Second School AT', slug: 'second-schoolat-e2e', status: 'ACTIVE' } });
    secondInstitutionId = secondInstitution.id;
    const secondAdminRole = await prisma.role.create({ data: { name: 'INSTITUTION_ADMIN', roleType: 'TENANT', institutionId: secondInstitutionId } });
    const allPermissions = await prisma.permission.findMany();
    for (const perm of allPermissions) { await prisma.rolePermission.create({ data: { roleId: secondAdminRole.id, permissionId: perm.id } }); }
    const secondAdmin = await prisma.user.create({ data: { email: 'admin@second-schoolat-e2e.dev', passwordHash: VALID_PASSWORD_HASH, firstName: 'Second', lastName: 'Admin', status: 'ACTIVE' } });
    const secondAdminMem = await prisma.userInstitution.create({ data: { userId: secondAdmin.id, institutionId: secondInstitutionId, status: 'ACTIVE' } });
    await prisma.userRole.create({ data: { userInstitutionId: secondAdminMem.id, roleId: secondAdminRole.id, institutionId: secondInstitutionId } });
    const login = async (email: string) => { const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password: 'Demo1234!' }); return res.body.accessToken; };
    adminToken = await login('admin@demo-school.dev');
    parentToken = await login('parent@demo-school.dev');
  }, 30000);

  afterAll(async () => {
    if (createdAreaId) { await prisma.area.delete({ where: { id: createdAreaId } }).catch(() => {}); }
    await prisma.rolePermission.deleteMany({ where: { role: { institutionId: secondInstitutionId } } });
    await prisma.userRole.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.userInstitution.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.role.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.area.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.subject.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.institution.delete({ where: { id: secondInstitutionId } });
    await prisma.user.delete({ where: { email: 'admin@second-schoolat-e2e.dev' } });
    await app.close();
    await prisma.$disconnect();
  });

  describe('GET /api/v1/areas', () => {
    it('should return 401 without auth', async () => {
      await request(app.getHttpServer()).get('/api/v1/areas').set('X-Institution-Id', demoInstitutionId).expect(401);
    });
    it('should return 403 for parent without areas:read', async () => {
      await request(app.getHttpServer()).get('/api/v1/areas').set('Authorization', `Bearer ${parentToken}`).set('X-Institution-Id', demoInstitutionId).expect(403);
    });
    it('should return seeded demo areas for admin with tenant scoping', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/areas').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      for (const area of res.body.data) { expect(area.institutionId).toBe(demoInstitutionId); }
    });
  });

  describe('POST /api/v1/areas', () => {
    it('should create an area and scope it to the acting institution', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/areas').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).send({ code: 'ARE-E2E' + Date.now().toString().slice(-6), name: 'E2E Area', isOfficial: true }).expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.institutionId).toBe(demoInstitutionId);
      createdAreaId = res.body.id;
    });
    it('should reject body tampering with a cross-tenant area', async () => {
      await request(app.getHttpServer()).post('/api/v1/areas').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).send({ code: 'ARE-T' + Date.now().toString().slice(-6), name: 'Tamper', isOfficial: true, institutionId: secondInstitutionId }).expect(400);
    });
  });

  describe('Subjects academic fields (areaId/subjectType/level)', () => {
    let subjectId: string;
    it('should allow creating a subject with area, type and levels', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/subjects').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).send({
        code: 'SUB-E2E' + Date.now().toString().slice(-6),
        name: 'E2E Subject',
        areaId: createdAreaId,
        subjectType: 'OBLIGATORIA',
        minimumLevel: 'PRIMARIA',
        maximumLevel: 'MEDIA',
      }).expect(201);
      expect(res.body.areaId).toBe(createdAreaId);
      expect(res.body.subjectType).toBe('OBLIGATORIA');
      expect(res.body.minimumLevel).toBe('PRIMARIA');
      subjectId = res.body.id;
      await prisma.subject.delete({ where: { id: subjectId } }).catch(() => {});
    });
    it('should reject a subject referencing an area from another institution', async () => {
      const otherArea = await prisma.area.findFirst({ where: { institutionId: secondInstitutionId } });
      if (otherArea) {
        await request(app.getHttpServer()).post('/api/v1/subjects').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).send({ code: 'SUB-X' + Date.now().toString().slice(-6), name: 'X', areaId: otherArea.id }).expect(404);
      }
    });
  });

  describe('GET /api/v1/teacher-assignments/teachers', () => {
    it('should list teachers with courses/subjects/students', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/teacher-assignments/teachers').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      const demoTeacher = res.body.find((t: { teacherUserId: string }) => t.teacherUserId);
      expect(demoTeacher).toBeDefined();
      expect(demoTeacher).toHaveProperty('firstName');
      expect(demoTeacher).toHaveProperty('isDirector');
      expect(Array.isArray(demoTeacher.courses)).toBe(true);
    });
  });

  describe('GET /api/v1/teacher-assignments/directories', () => {
    it('should list group directors (DIRECTOR_DE_GRUPO role holders)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/teacher-assignments/directories').set('Authorization', `Bearer ${adminToken}`).set('X-Institution-Id', demoInstitutionId).expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      const demoTeacher = res.body.find((d: { email: string }) => d.email === 'teacher@demo-school.dev');
      expect(demoTeacher).toBeDefined();
    });
  });
});