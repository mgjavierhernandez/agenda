import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

describe('Institutions Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let adminToken: string;
  let superAdminToken: string;
  let createdInstitutionId: string;

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

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Demo1234!' });
      return res.body.accessToken;
    };

    adminToken = await login('admin@demo-school.dev');
    superAdminToken = await login('superadmin@agenda.dev');
  }, 30000);

  afterAll(async () => {
    if (createdInstitutionId) {
      await prisma.rolePermission.deleteMany({
        where: { role: { institutionId: createdInstitutionId } },
      });
      await prisma.role.deleteMany({
        where: { institutionId: createdInstitutionId },
      });
      await prisma.userInstitution.deleteMany({
        where: { institutionId: createdInstitutionId },
      });
      await prisma.institution.delete({ where: { id: createdInstitutionId } }).catch(() => {});
    }
    await app.close();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/institutions', () => {
    it('TEST-01: SUPER_ADMIN creates institution → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/institutions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'E2E Test Institution',
          slug: `e2e-inst-${Date.now()}`,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('E2E Test Institution');
      createdInstitutionId = res.body.id;
    });

    it('TEST-02: INSTITUTION_ADMIN cannot create institution → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/institutions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Should Fail',
          slug: 'should-fail',
        })
        .expect(403);
    });

    it('TEST-03: Missing required fields → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/institutions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({})
        .expect(400);
    });

    it('TEST-04: Duplicate slug → 409', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/institutions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Duplicate',
          slug: 'demo-school',
        })
        .expect(409);
    });

    it('TEST-05: Body institutionId rejected (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/institutions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Bypass',
          slug: 'bypass',
          institutionId: demoInstitutionId,
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/institutions', () => {
    it('TEST-06: SUPER_ADMIN lists institutions → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/institutions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('TEST-07: INSTITUTION_ADMIN cannot list all institutions → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/institutions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('TEST-08: Unauthenticated → 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/institutions').expect(401);
    });
  });

  describe('GET /api/v1/institutions/:id', () => {
    it('TEST-09: SUPER_ADMIN gets institution by ID → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/institutions/${createdInstitutionId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdInstitutionId);
      expect(res.body.name).toBe('E2E Test Institution');
    });

    it('TEST-10: Non-existent ID → 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/institutions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/institutions/:id', () => {
    it('TEST-11: SUPER_ADMIN updates institution → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/institutions/${createdInstitutionId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Updated E2E Institution' })
        .expect(200);

      expect(res.body.name).toBe('Updated E2E Institution');
    });

    it('TEST-12: Slug conflict → 409', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/institutions/${createdInstitutionId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ slug: 'demo-school' })
        .expect(409);
    });
  });

  describe('PATCH /api/v1/institutions/:id/deactivate', () => {
    let deactivateTargetId: string;

    beforeAll(async () => {
      const inst = await prisma.institution.create({
        data: {
          name: 'Deactivate Target',
          slug: `deactivate-target-${Date.now()}`,
          status: 'ACTIVE',
        },
      });
      deactivateTargetId = inst.id;
    });

    it('TEST-13: SUPER_ADMIN deactivates institution → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/institutions/${deactivateTargetId}/deactivate`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.status).toBe('INACTIVE');
    });

    it('TEST-14: Already inactive is idempotent → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/institutions/${deactivateTargetId}/deactivate`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.status).toBe('INACTIVE');
    });
  });

  describe('Tenant-scoped institution access (IDOR protection)', () => {
    it('TEST-15: INSTITUTION_ADMIN reads their OWN institution → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/institutions/${demoInstitutionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.id).toBe(demoInstitutionId);
    });

    it('TEST-16: INSTITUTION_ADMIN cannot read another institution via its own tenant → 404', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/institutions/${createdInstitutionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });

    it('TEST-17: INSTITUTION_ADMIN updates their OWN institution → 200', async () => {
      const fresh = await prisma.institution.findUnique({ where: { id: demoInstitutionId } });
      const originalName = fresh!.name;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/institutions/${demoInstitutionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ name: 'Demo School Renamed In Test' })
        .expect(200);

      expect(res.body.name).toBe('Demo School Renamed In Test');

      await request(app.getHttpServer())
        .patch(`/api/v1/institutions/${demoInstitutionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ name: originalName })
        .expect(200);
    });

    it('TEST-18: INSTITUTION_ADMIN cannot deactivate another institution → 404', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/institutions/${createdInstitutionId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });
  });
});
