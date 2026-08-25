import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
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
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 200 with user and tokens for valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@demo-school.dev',
          password: 'Demo1234!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('admin@demo-school.dev');
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 for non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@demo-school.dev',
          password: 'Demo1234!',
        })
        .expect(401);
    });

    it('should return 401 for incorrect password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@demo-school.dev',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should return 401 for inactive user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@demo-school.dev',
          password: 'Demo1234!',
        })
        .expect(200);
    });

    it('should return same error for non-existent email and wrong password', async () => {
      const response1 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@demo-school.dev',
          password: 'Demo1234!',
        });

      const response2 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@demo-school.dev',
          password: 'WrongPassword123!',
        });

      expect(response1.status).toBe(response2.status);
      expect(response1.body).toEqual(response2.body);
    });

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
          password: 'Demo1234!',
        })
        .expect(400);
    });

    it('should reject short password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@demo-school.dev',
          password: 'short',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@demo-school.dev',
          password: 'Demo1234!',
        });
      refreshToken = response.body.refreshToken;
    });

    it('should return 200 with new tokens for valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.refreshToken).not.toBe(refreshToken);

      refreshToken = response.body.refreshToken;
    });

    it('should return 401 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);
    });

    it('should return 401 for revoked refresh token (rotation)', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'teacher@demo-school.dev',
          password: 'Demo1234!',
        });

      const rt1 = loginResponse.body.refreshToken;

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rt1 })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rt1 })
        .expect(401);
    });

    it('should return 401 for missing refreshToken', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should revoke refresh token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'parent@demo-school.dev',
          password: 'Demo1234!',
        });

      const refreshToken = loginResponse.body.refreshToken;

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should handle logout with already revoked token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'student@demo-school.dev',
          password: 'Demo1234!',
        });

      const refreshToken = loginResponse.body.refreshToken;

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(200);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should return 200 with user profile for valid access token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@demo-school.dev',
          password: 'Demo1234!',
        });

      const accessToken = loginResponse.body.accessToken;

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe('admin@demo-school.dev');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 401 for missing access token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });

    it('should return 401 for invalid access token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 for expired access token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid')
        .expect(401);
    });
  });
});
