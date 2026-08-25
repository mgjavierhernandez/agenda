import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();

describe('Files (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let institutionId: string;
  let demoTaskId: string;
  let demoCommId: string;
  let uploadedFileId: string;

  beforeAll(async () => {
    const inst = await prisma.institution.findFirst();
    if (inst) {
      institutionId = inst.id;
    }

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

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo-school.dev', password: 'Demo1234!' });

    if (loginRes.status === 200) {
      adminToken = loginRes.body.accessToken;
    }
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  const auth = () => ({
    Authorization: `Bearer ${adminToken}`,
    'x-institution-id': institutionId,
  });

  const hasAdmin = () => !!adminToken && !!institutionId;

  describe('Authentication', () => {
    it('should return 401 without token for file upload', async () => {
      if (!institutionId) return;
      const fileContent = Buffer.from('test content');
      await request(app.getHttpServer())
        .post('/api/v1/files')
        .set('x-institution-id', institutionId)
        .attach('file', fileContent, { filename: 'test.txt', contentType: 'text/plain' })
        .expect(401);
    });
  });

  describe('File Upload', () => {
    it('should upload a valid PDF file', async () => {
      if (!hasAdmin()) return;
      const fileContent = Buffer.from('%PDF-1.4 test content here');
      const res = await request(app.getHttpServer())
        .post('/api/v1/files')
        .set(auth())
        .attach('file', fileContent, { filename: 'test-document.pdf', contentType: 'application/pdf' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('originalName');
      expect(res.body).toHaveProperty('storageKey');
      expect(res.body).toHaveProperty('checksum');
      expect(res.body.originalName).toBe('test-document.pdf');
      expect(res.body.mimeType).toBe('application/pdf');
      uploadedFileId = res.body.id;
    });

    it('should upload a PNG image', async () => {
      if (!hasAdmin()) return;
      const fileContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const res = await request(app.getHttpServer())
        .post('/api/v1/files')
        .set(auth())
        .attach('file', fileContent, { filename: 'image.png', contentType: 'image/png' })
        .expect(201);
      expect(res.body.mimeType).toBe('image/png');
    });

    it('should reject executable files', async () => {
      if (!hasAdmin()) return;
      const fileContent = Buffer.from('MZ executable content');
      await request(app.getHttpServer())
        .post('/api/v1/files')
        .set(auth())
        .attach('file', fileContent, { filename: 'evil.exe', contentType: 'application/x-executable' })
        .expect(400);
    });

    it('should reject empty files', async () => {
      if (!hasAdmin()) return;
      await request(app.getHttpServer())
        .post('/api/v1/files')
        .set(auth())
        .attach('file', Buffer.alloc(0), { filename: 'empty.txt', contentType: 'text/plain' })
        .expect(400);
    });
  });

  describe('File Metadata', () => {
    it('should get file metadata by id', async () => {
      if (!hasAdmin() || !uploadedFileId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/files/${uploadedFileId}`)
        .set(auth())
        .expect(200);
      expect(res.body.id).toBe(uploadedFileId);
      expect(res.body.originalName).toBe('test-document.pdf');
    });

    it('should return 404 for non-existent file', async () => {
      if (!hasAdmin()) return;
      const fakeId = crypto.randomUUID();
      await request(app.getHttpServer())
        .get(`/api/v1/files/${fakeId}`)
        .set(auth())
        .expect(404);
    });
  });

  describe('File Download', () => {
    it('should download file content', async () => {
      if (!hasAdmin() || !uploadedFileId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/files/${uploadedFileId}/download`)
        .set(auth())
        .expect(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['x-checksum']).toBeDefined();
    });
  });

  describe('Task Attachments', () => {
    it('should get a demo task', async () => {
      if (!hasAdmin()) return;
      const task = await prisma.task.findFirst({ where: { institutionId } });
      if (task) demoTaskId = task.id;
      expect(demoTaskId).toBeDefined();
    });

    it('should list existing task attachments', async () => {
      if (!hasAdmin() || !demoTaskId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${demoTaskId}/attachments`)
        .set(auth())
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should attach file to task', async () => {
      if (!hasAdmin() || !demoTaskId || !uploadedFileId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${demoTaskId}/attachments`)
        .set(auth())
        .send({ fileAssetId: uploadedFileId })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.fileAsset.id).toBe(uploadedFileId);
    });

    it('should reject duplicate attachment', async () => {
      if (!hasAdmin() || !demoTaskId || !uploadedFileId) return;
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${demoTaskId}/attachments`)
        .set(auth())
        .send({ fileAssetId: uploadedFileId })
        .expect(400);
    });

    it('should list task attachments after adding', async () => {
      if (!hasAdmin() || !demoTaskId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${demoTaskId}/attachments`)
        .set(auth())
        .expect(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Communication Attachments', () => {
    it('should get a demo communication', async () => {
      if (!hasAdmin()) return;
      const comm = await prisma.communication.findFirst({ where: { institutionId } });
      if (comm) demoCommId = comm.id;
      expect(demoCommId).toBeDefined();
    });

    it('should attach file to communication', async () => {
      if (!hasAdmin() || !demoCommId || !uploadedFileId) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/communications/${demoCommId}/attachments`)
        .set(auth())
        .send({ fileAssetId: uploadedFileId })
        .expect(201);
      expect(res.body).toHaveProperty('id');
    });

    it('should list communication attachments', async () => {
      if (!hasAdmin() || !demoCommId) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/communications/${demoCommId}/attachments`)
        .set(auth())
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('File Deletion', () => {
    it('should delete a task attachment', async () => {
      if (!hasAdmin() || !demoTaskId) return;
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${demoTaskId}/attachments`)
        .set(auth());
      if (!listRes.body || listRes.body.length === 0) return;
      const attachmentId = listRes.body[0].id;
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${demoTaskId}/attachments/${attachmentId}`)
        .set(auth())
        .expect(200);
    });
  });

  describe('Body Tampering', () => {
    it('should ignore extra institutionId in body (uses tenant header instead)', async () => {
      if (!hasAdmin()) return;
      const fileContent = Buffer.from('test-body-tamper');
      const res = await request(app.getHttpServer())
        .post('/api/v1/files')
        .set(auth())
        .field('institutionId', 'some-fake-id')
        .attach('file', fileContent, { filename: 'test.txt', contentType: 'text/plain' })
        .expect(201);

      expect(res.body).toBeDefined();
      expect(res.body.institutionId).toBe(institutionId);
      expect(res.body.institutionId).not.toBe('some-fake-id');
    });
  });
});
