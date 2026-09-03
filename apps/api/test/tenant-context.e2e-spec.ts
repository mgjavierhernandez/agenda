import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

const TS = Date.now();

describe('TenantContext (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let accessToken: string;
  let demoInstitutionId: string;
  let secondInstitutionId: string;

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

    // Login and get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@demo-school.dev',
        password: 'Demo1234!',
      })
      .expect(200);

    accessToken = loginResponse.body.accessToken;

    // Get demo institution ID
    const demoInstitution = await prisma.institution.findUnique({
      where: { slug: 'demo-school' },
    });
    demoInstitutionId = demoInstitution!.id;

    // Create a second institution for multi-tenant tests
    const secondInstitution = await prisma.institution.create({
      data: {
        name: 'Second School',
        slug: `second-school-${TS}`,
        status: 'ACTIVE',
      },
    });
    secondInstitutionId = secondInstitution.id;

    // Create membership for admin in second institution
    await prisma.userInstitution.create({
      data: {
        userId: loginResponse.body.user.id,
        institutionId: secondInstitutionId,
        status: 'ACTIVE',
      },
    });
  }, 30000);

  afterAll(async () => {
    // Clean up second institution
    if (secondInstitutionId) {
      await prisma.userInstitution.deleteMany({
        where: { institutionId: secondInstitutionId },
      });
      await prisma.institution.delete({
        where: { id: secondInstitutionId },
      });
    }
    await app.close();
    await prisma.$disconnect();
  });

  describe('GET /api/v1/auth/institutions', () => {
    it('should return list of user institutions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/institutions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('institutions');
      expect(Array.isArray(response.body.institutions)).toBe(true);
      expect(response.body.institutions.length).toBeGreaterThanOrEqual(1);

      const institution = response.body.institutions.find(
        (i: { id: string }) => i.id === demoInstitutionId,
      );
      expect(institution).toBeDefined();
      expect(institution.name).toBe('Demo School');
      expect(institution.slug).toBe('demo-school');
      expect(institution.status).toBe('ACTIVE');
    });

    it('should return 401 without access token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/institutions')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/tenant/select', () => {
    it('should return institution details for valid institution', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/tenant/select')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          institutionId: demoInstitutionId,
        })
        .expect(200);

      expect(response.body).toHaveProperty('institution');
      expect(response.body).toHaveProperty('membership');
      expect(response.body.institution.id).toBe(demoInstitutionId);
      expect(response.body.institution.name).toBe('Demo School');
      expect(response.body.membership.status).toBe('ACTIVE');
    });

    it('should return institution details for second institution', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/tenant/select')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          institutionId: secondInstitutionId,
        })
        .expect(200);

      expect(response.body.institution.id).toBe(secondInstitutionId);
      expect(response.body.institution.name).toBe('Second School');
    });

    it('should return 404 for institution without membership', async () => {
      // Create a third institution without membership
      const thirdInstitution = await prisma.institution.create({
        data: {
          name: 'Third School',
          slug: `third-school-${TS}`,
          status: 'ACTIVE',
        },
      });

      try {
        await request(app.getHttpServer())
          .post('/api/v1/auth/tenant/select')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            institutionId: thirdInstitution.id,
          })
          .expect(404);
      } finally {
        await prisma.institution.delete({ where: { id: thirdInstitution.id } });
      }
    });

    it('should return 401 without access token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/tenant/select')
        .send({
          institutionId: demoInstitutionId,
        })
        .expect(401);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/tenant/select')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          institutionId: 'invalid-uuid',
        })
        .expect(400);
    });

    it('should return 400 for missing institutionId', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/tenant/select')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v1/auth/tenant', () => {
    it('should return current tenant context from header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/tenant')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(response.body).toHaveProperty('institution');
      expect(response.body).toHaveProperty('membership');
      expect(response.body.institution.id).toBe(demoInstitutionId);
      expect(response.body.membership.status).toBe('ACTIVE');
    });

    it('should return 403 without X-Institution-Id header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/tenant')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('should return 403 for invalid institution in header', async () => {
      const fakeUuid = '123e4567-e89b-12d3-a456-426614174000';
      await request(app.getHttpServer())
        .get('/api/v1/auth/tenant')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Institution-Id', fakeUuid)
        .expect(403);
    });

    it('should return 403 for institution without membership', async () => {
      // Create institution without membership
      const noAccessInstitution = await prisma.institution.create({
        data: {
          name: 'No Access School',
          slug: `no-access-school-${TS}`,
          status: 'ACTIVE',
        },
      });

      try {
        await request(app.getHttpServer())
          .get('/api/v1/auth/tenant')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('X-Institution-Id', noAccessInstitution.id)
          .expect(403);
      } finally {
        await prisma.institution.delete({ where: { id: noAccessInstitution.id } });
      }
    });

    it('should return 403 for inactive membership', async () => {
      // Create institution and inactive membership
      const inactiveInst = await prisma.institution.create({
        data: {
          name: 'Inactive Membership School',
          slug: `inactive-membership-school-${TS}`,
          status: 'ACTIVE',
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@demo-school.dev',
          password: 'Demo1234!',
        })
        .expect(200);

      const inactiveMembership = await prisma.userInstitution.create({
        data: {
          userId: loginResponse.body.user.id,
          institutionId: inactiveInst.id,
          status: 'INACTIVE',
        },
      });

      try {
        await request(app.getHttpServer())
          .get('/api/v1/auth/tenant')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('X-Institution-Id', inactiveInst.id)
          .expect(403);
      } finally {
        await prisma.userInstitution.delete({ where: { id: inactiveMembership.id } });
        await prisma.institution.delete({ where: { id: inactiveInst.id } });
      }
    });

    it('should return 403 for inactive institution', async () => {
      // Create inactive institution with active membership
      const inactiveInst = await prisma.institution.create({
        data: {
          name: 'Inactive Institution',
          slug: `inactive-institution-${TS}`,
          status: 'INACTIVE',
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@demo-school.dev',
          password: 'Demo1234!',
        })
        .expect(200);

      const membership = await prisma.userInstitution.create({
        data: {
          userId: loginResponse.body.user.id,
          institutionId: inactiveInst.id,
          status: 'ACTIVE',
        },
      });

      try {
        await request(app.getHttpServer())
          .get('/api/v1/auth/tenant')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('X-Institution-Id', inactiveInst.id)
          .expect(403);
      } finally {
        await prisma.userInstitution.delete({ where: { id: membership.id } });
        await prisma.institution.delete({ where: { id: inactiveInst.id } });
      }
    });

    it('should return 401 without access token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/tenant')
        .set('X-Institution-Id', demoInstitutionId)
        .expect(401);
    });

    it('should return 403 for invalid UUID in header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/tenant')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Institution-Id', 'invalid-uuid')
        .expect(403);
    });
  });

  describe('Multi-tenant switching', () => {
    it('should be able to switch between institutions', async () => {
      // Get institutions list
      const institutionsResponse = await request(app.getHttpServer())
        .get('/api/v1/auth/institutions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(institutionsResponse.body.institutions.length).toBeGreaterThanOrEqual(2);

      // Switch to demo school
      const response1 = await request(app.getHttpServer())
        .get('/api/v1/auth/tenant')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(response1.body.institution.slug).toBe('demo-school');

      // Switch to second school
      const response2 = await request(app.getHttpServer())
        .get('/api/v1/auth/tenant')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(200);

      expect(response2.body.institution.slug).toBe(`second-school-${TS}`);
    });
  });
});
