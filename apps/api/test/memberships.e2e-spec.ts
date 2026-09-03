import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('Memberships Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;
  let adminToken: string;
  let teacherToken: string;
  let testUserId: string;

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
        name: 'Second School Memberships E2E',
        slug: 'second-school-memberships-e2e',
        status: 'ACTIVE',
      },
    });
    secondInstitutionId = secondInstitution.id;

    const secondAdminRole = await prisma.role.create({
      data: { name: 'INSTITUTION_ADMIN', roleType: 'TENANT', institutionId: secondInstitutionId },
    });

    const allPermissions = await prisma.permission.findMany();
    for (const perm of allPermissions) {
      await prisma.rolePermission.create({
        data: { roleId: secondAdminRole.id, permissionId: perm.id },
      });
    }

    const secondAdmin = await prisma.user.create({
      data: {
        email: 'admin@second-memberships-e2e.dev',
        passwordHash: VALID_PASSWORD_HASH,
        firstName: 'Second', lastName: 'Admin', status: 'ACTIVE',
      },
    });

    const secondAdminMembership = await prisma.userInstitution.create({
      data: {
        userId: secondAdmin.id,
        institutionId: secondInstitutionId,
        status: MembershipStatus.ACTIVE,
      },
    });

    await prisma.userRole.create({
      data: {
        userInstitutionId: secondAdminMembership.id,
        roleId: secondAdminRole.id,
        institutionId: secondInstitutionId,
      },
    });

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Institution-Id', demoInstitutionId)
        .send({ email, password: 'Demo1234!' });
      return res.body.accessToken;
    };

    adminToken = await login('admin@demo-school.dev');
    teacherToken = await login('teacher@demo-school.dev');
  }, 30000);

  afterAll(async () => {
    if (testUserId) {
      await prisma.userRole.deleteMany({ where: { userInstitution: { userId: testUserId } } });
      await prisma.userInstitution.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.rolePermission.deleteMany({ where: { role: { institutionId: secondInstitutionId } } });
    await prisma.role.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.userInstitution.deleteMany({ where: { institutionId: secondInstitutionId } });
    await prisma.user.delete({ where: { email: 'admin@second-memberships-e2e.dev' } }).catch(() => {});
    await prisma.institution.delete({ where: { id: secondInstitutionId } }).catch(() => {});
    await app.close();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/institutions/:institutionId/memberships', () => {
    it('TEST-01: Admin links user to institution \u2192 201', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'link-target-mem-e2e@dev.test',
          passwordHash: VALID_PASSWORD_HASH,
          firstName: 'Link', lastName: 'Target', status: 'ACTIVE',
        },
      });
      testUserId = user.id;

      const res = await request(app.getHttpServer())
        .post(`/api/v1/institutions/${demoInstitutionId}/memberships`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ userId: user.id })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.userId).toBe(user.id);
    });

    it('TEST-02: Duplicate membership \u2192 409', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/institutions/${demoInstitutionId}/memberships`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ userId: testUserId })
        .expect(409);
    });

    it('TEST-03: Non-existent user \u2192 404', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/institutions/${demoInstitutionId}/memberships`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ userId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('TEST-04: Teacher cannot link user \u2192 403', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'teacher-block-mem@dev.test',
          passwordHash: VALID_PASSWORD_HASH,
          firstName: 'Blocked', lastName: 'User', status: 'ACTIVE',
        },
      });

      try {
        await request(app.getHttpServer())
          .post(`/api/v1/institutions/${demoInstitutionId}/memberships`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .send({ userId: otherUser.id })
          .expect(403);
      } finally {
        await prisma.user.delete({ where: { id: otherUser.id } });
      }
    });

    it('TEST-05: Cross-tenant isolation \u2192 403', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/institutions/${secondInstitutionId}/memberships`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .send({ userId: testUserId })
        .expect(403);
    });
  });

  describe('GET /api/v1/institutions/:institutionId/memberships', () => {
    it('TEST-06: Admin lists memberships \u2192 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/institutions/${demoInstitutionId}/memberships`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('TEST-07: Teacher cannot list memberships \u2192 200', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/institutions/${demoInstitutionId}/memberships`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(403);
    });
  });

  describe('POST /api/v1/institutions/:institutionId/memberships/user/:userId/roles', () => {
    let teacherRoleId: string;

    beforeAll(async () => {
      const role = await prisma.role.findFirst({
        where: { name: 'TEACHER', institutionId: demoInstitutionId },
      });
      teacherRoleId = role!.id;
    });

    it('TEST-08: Admin assigns role \u2192 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/institutions/${demoInstitutionId}/memberships/user/${testUserId}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ roleId: teacherRoleId })
        .expect(201);

      expect(res.body.roleId).toBe(teacherRoleId);
    });

    it('TEST-09: Duplicate role assignment \u2192 409', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/institutions/${demoInstitutionId}/memberships/user/${testUserId}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ roleId: teacherRoleId })
        .expect(409);
    });

    it('TEST-10: Cannot assign SUPER_ADMIN role \u2192 403', async () => {
      const superAdminRole = await prisma.role.findFirst({
        where: { name: 'SUPER_ADMIN' },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/institutions/${demoInstitutionId}/memberships/user/${testUserId}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ roleId: superAdminRole!.id })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/institutions/:institutionId/memberships/user/:userId/roles/:roleId', () => {
    let teacherRoleId: string;

    beforeAll(async () => {
      const role = await prisma.role.findFirst({
        where: { name: 'TEACHER', institutionId: demoInstitutionId },
      });
      teacherRoleId = role!.id;
    });

    it('TEST-11: Admin removes role \u2192 204', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/institutions/${demoInstitutionId}/memberships/user/${testUserId}/roles/${teacherRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(204);
    });
  });

  describe('DELETE /api/v1/institutions/:institutionId/memberships/user/:userId', () => {
    it('TEST-12: Admin unlinks user \u2192 204', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/institutions/${demoInstitutionId}/memberships/user/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(204);
    });
  });

  describe('Role assignment escalation protection', () => {
    let escalationUserId: string;

    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          email: 'escalation-target-mem@dev.test',
          passwordHash: VALID_PASSWORD_HASH,
          firstName: 'Escalation', lastName: 'Target', status: 'ACTIVE',
        },
      });
      escalationUserId = user.id;

      await prisma.userInstitution.create({
        data: {
          userId: user.id,
          institutionId: demoInstitutionId,
          status: MembershipStatus.ACTIVE,
        },
      });
    });

    afterAll(async () => {
      if (escalationUserId) {
        await prisma.userRole.deleteMany({ where: { userInstitution: { userId: escalationUserId } } });
        await prisma.userInstitution.deleteMany({ where: { userId: escalationUserId } });
        await prisma.user.delete({ where: { id: escalationUserId } }).catch(() => {});
      }
    });

    it('TEST-13: INSTITUTION_ADMIN cannot assign SUPER_ADMIN role \u2192 403', async () => {
      const superAdminRole = await prisma.role.findFirst({
        where: { name: 'SUPER_ADMIN' },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/institutions/${demoInstitutionId}/memberships/user/${escalationUserId}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ roleId: superAdminRole!.id })
        .expect(403);
    });

    it('TEST-14: Body tampering with institutionId rejected \u2192 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/institutions/${demoInstitutionId}/memberships`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ userId: escalationUserId, institutionId: secondInstitutionId })
        .expect(400);
    });

    it('TEST-15: ADMIN cannot assign a role that belongs to another institution -> 403', async () => {
      const foreignRole = await prisma.role.findFirst({
        where: { institutionId: secondInstitutionId },
        select: { id: true },
      });
      expect(foreignRole).toBeTruthy();

      await request(app.getHttpServer())
        .post(`/api/v1/institutions/${demoInstitutionId}/memberships/user/${escalationUserId}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .send({ roleId: foreignRole!.id })
        .expect(403);
    });
  });

  describe('GET memberships with search filter', () => {
    it('TEST-16: Admin searches memberships by user email -> 200 with filtered data', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/institutions/${demoInstitutionId}/memberships?search=admin@demo-school`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
