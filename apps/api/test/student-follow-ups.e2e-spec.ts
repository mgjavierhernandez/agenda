/* eslint-disable @typescript-eslint/no-explicit-any */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

describe('Student Follow-Ups (Observador) e2e', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;

  let adminToken: string;
  let recipientUserId = '';
  let createdStudentId = '';
  let createdFollowUpId = '';
  let createdEntryId = '';
  let createdCitationId = '';
  let createdSignatureRequestId = '';

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

    const demoInstitution = await prisma.institution.findUnique({ where: { slug: 'demo-school' } });
    demoInstitutionId = demoInstitution!.id;

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Demo1234!' });
      return res.body.accessToken as string;
    };

    adminToken = await login('admin@demo-school.dev');

    const teacher = await prisma.user.findUnique({ where: { email: 'teacher@demo-school.dev' } });
    recipientUserId = teacher!.id;

    const student = await prisma.student.create({
      data: {
        institutionId: demoInstitutionId,
        firstName: 'E2EObs',
        lastName: 'Alumno',
        documentType: 'DNI',
        documentNumber: `OBS${Date.now().toString().slice(-8)}`,
        status: 'ACTIVE',
      },
    });
    createdStudentId = student.id;

    // Clean stale resources created in prior runs, scoped to the demo tenant only.
    await prisma.signatureRecipient.deleteMany({
      where: { signatureRequest: { createdBy: { email: 'admin@demo-school.dev' } } },
    });
    await prisma.signatureRequest.deleteMany({
      where: { createdBy: { email: 'admin@demo-school.dev' } },
    });
  }, 30_000);

  afterAll(async () => {
    if (createdSignatureRequestId) {
      try {
        await prisma.signatureRecipient.deleteMany({
          where: { signatureRequestId: createdSignatureRequestId },
        });
        await prisma.signatureRequest.delete({ where: { id: createdSignatureRequestId } });
      } catch {
        // already gone
      }
    }
    if (createdCitationId) {
      try {
        await prisma.followUpCitation.delete({ where: { id: createdCitationId } });
      } catch {
        // already gone
      }
    }
    if (createdEntryId) {
      try {
        await prisma.followUpEntry.delete({ where: { id: createdEntryId } });
      } catch {
        // already gone
      }
    }
    if (createdFollowUpId) {
      try {
        await prisma.studentFollowUp.delete({ where: { id: createdFollowUpId } });
      } catch {
        // already gone
      }
    }
    if (createdStudentId) {
      try {
        await prisma.student.delete({ where: { id: createdStudentId } });
      } catch {
        // already gone
      }
    }
    await app.close();
    await prisma.$disconnect();
  });

  const instHeader = () => ({
    Authorization: `Bearer ${adminToken}`,
    'X-Institution-Id': demoInstitutionId,
  });

  describe('Observador flow (create follow-up -> entry -> citation -> signature)', () => {
    it('creates a follow-up for the student', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/student-follow-ups')
        .set(instHeader())
        .send({
          studentId: createdStudentId,
          type: 'CONVIVENCIA',
          severity: 'MEDIUM',
          confidentiality: 'CONFIDENTIAL',
          title: 'Seguimiento e2e Observador',
          summary: 'Resumen e2e',
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeTruthy();
      createdFollowUpId = res.body.id;
    });

    it('rejects creating a citation with a past scheduled time (H2)', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      const res = await request(app.getHttpServer())
        .post(`/api/v1/student-follow-ups/${createdFollowUpId}/citations`)
        .set(instHeader())
        .send({ scheduledAt: past, reason: 'Pasado' });
      expect(res.status).toBe(400);
    });

    it('creates a citation for the follow-up (H2)', async () => {
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const res = await request(app.getHttpServer())
        .post(`/api/v1/student-follow-ups/${createdFollowUpId}/citations`)
        .set(instHeader())
        .send({
          scheduledAt: future,
          reason: 'Citación a acudiente',
          objective: 'Tratar conducta',
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('SCHEDULED');
      createdCitationId = res.body.id;
    });

    it('lists citations for the follow-up scoped by tenant', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student-follow-ups/${createdFollowUpId}/citations`)
        .set(instHeader());
      expect(res.status).toBe(200);
      expect(res.body.data.some((c: any) => c.id === createdCitationId)).toBe(true);
    });

    it('completes a citation status transition (H2)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/student-follow-ups/${createdFollowUpId}/citations/${createdCitationId}`)
        .set(instHeader())
        .send({ status: 'COMPLETED', result: 'Acudiente asistió' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
    });

    it('creates a follow-up entry (used to link a signature)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/student-follow-ups/${createdFollowUpId}/entries`)
        .set(instHeader())
        .send({ entryType: 'MEETING', content: 'Reunión con el acudiente' });
      expect(res.status).toBe(201);
      createdEntryId = res.body.id;
    });

    it('requests a signature linked to the follow-up + entry (H1)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/student-follow-ups/${createdFollowUpId}/signatures`)
        .set(instHeader())
        .send({
          title: 'Firma de recibido',
          followUpEntryId: createdEntryId,
          recipientUserIds: [recipientUserId],
        });
      expect(res.status).toBe(201);
      expect(res.body.followUpId).toBe(createdFollowUpId);
      createdSignatureRequestId = res.body.id;
    });

    it('lists signatures linked to the follow-up (trazabilidad)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/student-follow-ups/${createdFollowUpId}/signatures`)
        .set(instHeader());
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (createdSignatureRequestId) {
        expect(res.body.some((s: any) => s.id === createdSignatureRequestId)).toBe(true);
      }
    });
  });
});
