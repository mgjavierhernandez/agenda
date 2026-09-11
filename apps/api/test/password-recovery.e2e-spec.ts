import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();

describe('Password Recovery (e2e)', () => {
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
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should return 200 with generic message for valid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@demo-school.dev' })
        .expect(200);

      expect(response.body.message).toContain('Si existe una cuenta');
    });

    it('should return 200 with same generic message for unknown email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@demo-school.dev' })
        .expect(200);

      expect(response.body.message).toContain('Si existe una cuenta');
    });

    it('should return same status and message for known and unknown emails', async () => {
      const response1 = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@demo-school.dev' });

      const response2 = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'unknown@demo-school.dev' });

      expect(response1.status).toBe(response2.status);
      expect(response1.body.message).toBe(response2.body.message);
    });

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('should reject missing email', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/forgot-password').send({}).expect(400);
    });

    it('should not reveal raw token in response', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@demo-school.dev' })
        .expect(200);

      const responseStr = JSON.stringify(response.body);
      expect(responseStr).not.toMatch(/tokenHash/i);
      expect(responseStr).not.toMatch(/expiresAt/i);
    });

    it('should create a password reset token in database', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'teacher@demo-school.dev' })
        .expect(200);

      const user = await prisma.user.findUnique({ where: { email: 'teacher@demo-school.dev' } });
      const token = await prisma.passwordResetToken.findFirst({
        where: { userId: user!.id, usedAt: null },
      });
      expect(token).toBeTruthy();
      expect(token!.expiresAt).toBeInstanceOf(Date);
      expect(token!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should invalidate previous tokens on repeated requests', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'parent@demo-school.dev' })
        .expect(200);

      const user = await prisma.user.findUnique({ where: { email: 'parent@demo-school.dev' } });

      const token1 = await prisma.passwordResetToken.findFirst({
        where: { userId: user!.id, usedAt: null },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'parent@demo-school.dev' })
        .expect(200);

      const token1After = await prisma.passwordResetToken.findUnique({
        where: { id: token1!.id },
      });
      expect(token1After!.usedAt).not.toBeNull();

      const token2 = await prisma.passwordResetToken.findFirst({
        where: { userId: user!.id, usedAt: null },
      });
      expect(token2).toBeTruthy();
      expect(token2!.id).not.toBe(token1!.id);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    let resetToken: string;

    beforeAll(async () => {
      const user = await prisma.user.findUnique({ where: { email: 'admin@demo-school.dev' } });

      resetToken = crypto.randomBytes(32).toString('base64url');
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          userId: user!.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
    });

    afterAll(async () => {
      const argon2 = await import('argon2');
      const user = await prisma.user.findUnique({ where: { email: 'admin@demo-school.dev' } });
      if (user) {
        const passwordHash = await argon2.hash('Demo1234!', {
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        });
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash },
        });
      }
    });

    it('should reset password with valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, newPassword: 'NewSecurePass123!' })
        .expect(200);

      expect(response.body.message).toContain('Password has been reset');
    });

    it('should reject old password after reset', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@demo-school.dev', password: 'Demo1234!' })
        .expect(401);
    });

    it('should accept new password after reset', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@demo-school.dev', password: 'NewSecurePass123!' })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject used token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, newPassword: 'AnotherPass123!' })
        .expect(400);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: 'completely-invalid-token', newPassword: 'AnotherPass123!' })
        .expect(400);
    });

    it('should reject expired token', async () => {
      const user = await prisma.user.findUnique({ where: { email: 'teacher@demo-school.dev' } });

      const expiredToken = crypto.randomBytes(32).toString('base64url');
      const expiredTokenHash = crypto.createHash('sha256').update(expiredToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          userId: user!.id,
          tokenHash: expiredTokenHash,
          expiresAt: new Date(Date.now() - 3600000),
        },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: expiredToken, newPassword: 'AnotherPass123!' })
        .expect(400);
    });

    it('should reject short password', async () => {
      const user = await prisma.user.findUnique({ where: { email: 'student@demo-school.dev' } });

      const validToken = crypto.randomBytes(32).toString('base64url');
      const validTokenHash = crypto.createHash('sha256').update(validToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          userId: user!.id,
          tokenHash: validTokenHash,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: validToken, newPassword: 'short' })
        .expect(400);
    });

    it('should reject missing token field', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ newPassword: 'AnotherPass123!' })
        .expect(400);
    });

    it('should reject missing newPassword field', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: 'some-token' })
        .expect(400);
    });

    it('should reject extra fields (body tampering)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'some-token',
          newPassword: 'AnotherPass123!',
          userId: 'some-user-id',
          institutionId: 'some-inst-id',
        })
        .expect(400);
    });
  });
});
