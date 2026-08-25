import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
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

  describe('GET /api/v1/health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/v1/health/readiness', () => {
    it('should return 200 when database is available', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/readiness')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('connected');
    });
  });

  describe('Security Headers', () => {
    it('should include X-Content-Type-Options header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should include X-Frame-Options header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('should include Referrer-Policy header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.headers['referrer-policy']).toBeDefined();
    });

    it('should include X-Request-Id in response', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('should echo client-provided X-Request-Id when valid', async () => {
      const customId = 'test-request-id-123';
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('X-Request-Id', customId)
        .expect(200);

      expect(res.headers['x-request-id']).toBe(customId);
    });

    it('should generate new X-Request-Id for invalid client value', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('X-Request-Id', ' spaces and special chars! ')
        .expect(200);

      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-request-id']).not.toBe(' spaces and special chars! ');
    });
  });
});
