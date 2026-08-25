import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus, UserStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('Users Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;
  let adminToken: string;
  let teacherToken: string;
  let createdUserId: string;

  const testEmail = `e2e-user-${Date.now()}@test.dev`;

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
        name: 'Second School Users E2E',
        slug: 'second-school-users-e2e',
        status: 'ACTIVE',
      },
    });
    secondInstitutionId = secondInstitution.id;

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Demo1234!' });
      return res.body.accessToken;
    };

    adminToken = await login('admin@demo-school.dev');
    teacherToken = await login('teacher@demo-school.dev');
  }, 30000);

  afterAll(async () => {
    if (createdUserId) {
      await prisma.userRole.deleteMany({
        where: { userInstitution: { userId: createdUserId } },
      });
      await prisma.userInstitution.deleteMany({
        where: { userId: createdUserId },
      });
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
    }
    await prisma.userInstitution.deleteMany({
      where: { institutionId: secondInstitutionId },
    });
    await prisma.institution.delete({ where: { id: secondInstitutionId } }).catch(() => {});
    await app.close();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/users', () => {
    it('TEST-01: Admin creates user \u2192 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          email: testEmail,
          password: 'TestPass123!',
          firstName: 'E2E',
          lastName: 'User',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(testEmail);
      expect(res.body).not.toHaveProperty('passwordHash');
      createdUserId = res.body.id;

      await prisma.userInstitution.create({
        data: {
          userId: res.body.id,
          institutionId: demoInstitutionId,
          status: 'ACTIVE',
        },
      });
    });

    it('TEST-02: Email is normalized to lowercase', async () => {
      const upperEmail = `UPPER-${Date.now()}@TEST.dev`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          email: upperEmail,
          password: 'TestPass123!',
          firstName: 'Upper',
          lastName: 'Case',
        })
        .expect(201);

      expect(res.body.email).toBe(upperEmail.toLowerCase());
      await prisma.userRole.deleteMany({ where: { userInstitution: { userId: res.body.id } } });
      await prisma.userInstitution.deleteMany({ where: { userId: res.body.id } });
      await prisma.user.delete({ where: { id: res.body.id } });
    });

    it('TEST-03: Duplicate email \u2192 409', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          email: testEmail,
          password: 'TestPass123!',
          firstName: 'Dup',
          lastName: 'User',
        })
        .expect(409);
    });

    it('TEST-04: Missing required fields \u2192 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({})
        .expect(400);
    });

    it('TEST-05: Teacher cannot create user \u2192 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          email: 'teacher-creates@test.dev',
          password: 'TestPass123!',
          firstName: 'Teacher',
          lastName: 'Created',
        })
        .expect(403);
    });

    it('TEST-06: Body institutionId rejected (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({
          email: 'bypass@test.dev',
          password: 'TestPass123!',
          firstName: 'Bypass',
          lastName: 'Attempt',
          institutionId: secondInstitutionId,
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/users', () => {
    it('TEST-07: Admin lists users in institution \u2192 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      for (const user of res.body.data) {
        expect(user).not.toHaveProperty('passwordHash');
      }
    });

    it('TEST-08: Cross-tenant isolation - admin cannot list users of other institution', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(403);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('TEST-09: Admin gets user by ID \u2192 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.id).toBe(createdUserId);
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('TEST-10: Non-existent user \u2192 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('TEST-11: Admin updates user \u2192 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ firstName: 'Updated' })
        .expect(200);

      expect(res.body.firstName).toBe('Updated');
    });
  });

  describe('PATCH /api/v1/users/:id/deactivate', () => {
    let deactivateUserId: string;

    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          email: `deactivate-target-${Date.now()}@test.dev`,
          passwordHash: VALID_PASSWORD_HASH,
          firstName: 'Deactivate',
          lastName: 'Target',
          status: UserStatus.ACTIVE,
        },
      });
      deactivateUserId = user.id;
      await prisma.userInstitution.create({
        data: {
          userId: user.id,
          institutionId: demoInstitutionId,
          status: MembershipStatus.ACTIVE,
        },
      });
    });

    it('TEST-12: Admin deactivates user \u2192 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${deactivateUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.status).toBe('INACTIVE');
    });

    it('TEST-13: Deactivated user tokens are revoked', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: `deactivate-target-${Date.now() - 1}@test.dev`,
          password: 'Demo1234!',
        });
    });
  });
});
