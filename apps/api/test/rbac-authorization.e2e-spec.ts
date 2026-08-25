import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

describe('RBAC Authorization (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;

  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let studentToken: string;
  let superAdminToken: string;
  let secondInstTeacherToken: string;

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
        name: 'Second School RBAC',
        slug: 'second-school-rbac-e2e',
        status: 'ACTIVE',
      },
    });
    secondInstitutionId = secondInstitution.id;

    const secondTeacher = await prisma.user.create({
      data: {
        email: 'teacher@second-school-rbac-e2e.dev',
        passwordHash: VALID_PASSWORD_HASH,
        firstName: 'Second',
        lastName: 'Teacher',
        status: 'ACTIVE',
      },
    });

    const secondTeacherMembership = await prisma.userInstitution.create({
      data: {
        userId: secondTeacher.id,
        institutionId: secondInstitutionId,
        status: MembershipStatus.ACTIVE,
      },
    });

    const secondTeacherRole = await prisma.role.findFirst({
      where: { name: 'TEACHER', institutionId: secondInstitutionId },
    });

    if (secondTeacherRole) {
      await prisma.userRole.create({
        data: {
          userInstitutionId: secondTeacherMembership.id,
          roleId: secondTeacherRole.id,
          institutionId: secondInstitutionId,
        },
      });
    }

    const superAdminUser = await prisma.user.findUnique({
      where: { email: 'superadmin@agenda.dev' },
    });

    const existingSuperAdminMembership = await prisma.userInstitution.findUnique({
      where: {
        userId_institutionId: {
          userId: superAdminUser!.id,
          institutionId: demoInstitutionId,
        },
      },
    });
    if (!existingSuperAdminMembership) {
      const membership = await prisma.userInstitution.create({
        data: {
          userId: superAdminUser!.id,
          institutionId: demoInstitutionId,
          status: MembershipStatus.ACTIVE,
        },
      });

      const adminRole = await prisma.role.findFirst({
        where: { name: 'INSTITUTION_ADMIN', institutionId: demoInstitutionId },
      });
      if (adminRole) {
        await prisma.userRole.create({
          data: {
            userInstitutionId: membership.id,
            roleId: adminRole.id,
            institutionId: demoInstitutionId,
          },
        });
      }
    }

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'Demo1234!' });
      return res.body.accessToken;
    };

    adminToken = await login('admin@demo-school.dev');
    teacherToken = await login('teacher@demo-school.dev');
    parentToken = await login('parent@demo-school.dev');
    studentToken = await login('student@demo-school.dev');
    superAdminToken = await login('superadmin@agenda.dev');

    const secondTeacherLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@second-school-rbac-e2e.dev', password: 'Demo1234!' });

    secondInstTeacherToken = secondTeacherLogin.body.accessToken;
  }, 30000);

  afterAll(async () => {
    await prisma.userRole.deleteMany({
      where: { institutionId: secondInstitutionId },
    });
    await prisma.userInstitution.deleteMany({
      where: { institutionId: secondInstitutionId },
    });
    await prisma.role.deleteMany({
      where: { institutionId: secondInstitutionId },
    });
    await prisma.institution.delete({ where: { id: secondInstitutionId } });
    await prisma.user.delete({ where: { email: 'teacher@second-school-rbac-e2e.dev' } });
    await app.close();
    await prisma.$disconnect();
  });

  describe('GET /api/v1/auth/authorization-check (institution:read)', () => {
    it('TEST 01: INSTITUTION_ADMIN (institution:read) → ALLOW', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.authorized).toBe(true);
      expect(res.body.institutionId).toBe(demoInstitutionId);
    });

    it('TEST 02: Teacher of A with X-Institution-Id of B (no membership) → DENY (403 from TenantContextGuard)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(403);
    });

    it('TEST 03: TEACHER lacks institution:read → DENY (403 from PermissionGuard)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(403);
    });

    it('TEST 04: PARENT lacks institution:read → DENY', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('Authorization', `Bearer ${parentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(403);
    });

    it('TEST 05: STUDENT lacks institution:read → DENY', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(403);
    });

    it('TEST 06: INSTITUTION_ADMIN has institution:read → ALLOW (duplicate confirmation)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.authorized).toBe(true);
    });

    it('TEST 07: Admin of A with X-Institution-Id of B (no membership) → DENY (cross-tenant)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(403);
    });

    it('TEST 08: SUPER_ADMIN with global permission + membership → ALLOW', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(200);

      expect(res.body.authorized).toBe(true);
    });

    it('TEST 09: User with membership but no roles → DENY', async () => {
      const userNoRoles = await prisma.user.create({
        data: {
          email: 'noroles@rbac-e2e.dev',
          passwordHash: VALID_PASSWORD_HASH,
          firstName: 'No',
          lastName: 'Roles',
          status: 'ACTIVE',
        },
      });

      const membership = await prisma.userInstitution.create({
        data: {
          userId: userNoRoles.id,
          institutionId: demoInstitutionId,
          status: MembershipStatus.ACTIVE,
        },
      });

      try {
        const loginRes = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'noroles@rbac-e2e.dev', password: 'Demo1234!' });

        await request(app.getHttpServer())
          .get('/api/v1/auth/authorization-check')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(403);
      } finally {
        await prisma.userInstitution.delete({ where: { id: membership.id } });
        await prisma.user.delete({ where: { id: userNoRoles.id } });
      }
    });

    it('TEST 10: User with multiple roles gets union of permissions', async () => {
      const multiRoleUser = await prisma.user.create({
        data: {
          email: 'multirole@rbac-e2e.dev',
          passwordHash: VALID_PASSWORD_HASH,
          firstName: 'Multi',
          lastName: 'Role',
          status: 'ACTIVE',
        },
      });

      const membership = await prisma.userInstitution.create({
        data: {
          userId: multiRoleUser.id,
          institutionId: demoInstitutionId,
          status: MembershipStatus.ACTIVE,
        },
      });

      const teacherRole = await prisma.role.findFirst({
        where: { name: 'TEACHER', institutionId: demoInstitutionId },
      });
      const parentRole = await prisma.role.findFirst({
        where: { name: 'PARENT', institutionId: demoInstitutionId },
      });

      try {
        if (teacherRole) {
          await prisma.userRole.create({
            data: {
              userInstitutionId: membership.id,
              roleId: teacherRole.id,
              institutionId: demoInstitutionId,
            },
          });
        }
        if (parentRole) {
          await prisma.userRole.create({
            data: {
              userInstitutionId: membership.id,
              roleId: parentRole.id,
              institutionId: demoInstitutionId,
            },
          });
        }

        const loginRes = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'multirole@rbac-e2e.dev', password: 'Demo1234!' });

        await request(app.getHttpServer())
          .get('/api/v1/auth/authorization-check')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .set('X-Institution-Id', demoInstitutionId)
          .expect(403);
      } finally {
        await prisma.userRole.deleteMany({ where: { userInstitutionId: membership.id } });
        await prisma.userInstitution.delete({ where: { id: membership.id } });
        await prisma.user.delete({ where: { id: multiRoleUser.id } });
      }
    });
  });

  describe('Authentication + Tenant + RBAC integration', () => {
    it('should return 401 without access token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('X-Institution-Id', demoInstitutionId)
        .expect(401);
    });

    it('should return 403 without X-Institution-Id header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should return 403 for invalid UUID in header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Institution-Id', 'invalid-uuid')
        .expect(403);
    });

    it('should return 403 for institution without membership', async () => {
      const noAccessInst = await prisma.institution.create({
        data: {
          name: 'No Access RBAC',
          slug: 'no-access-rbac-e2e',
          status: 'ACTIVE',
        },
      });

      try {
        await request(app.getHttpServer())
          .get('/api/v1/auth/authorization-check')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Institution-Id', noAccessInst.id)
          .expect(403);
      } finally {
        await prisma.institution.delete({ where: { id: noAccessInst.id } });
      }
    });

    it('should return 403 for inactive membership', async () => {
      const inactiveInst = await prisma.institution.create({
        data: {
          name: 'Inactive Membership RBAC',
          slug: 'inactive-membership-rbac-e2e',
          status: 'ACTIVE',
        },
      });

      const userInactive = await prisma.user.create({
        data: {
          email: 'inactive-member@rbac-e2e.dev',
          passwordHash: VALID_PASSWORD_HASH,
          firstName: 'Inactive',
          lastName: 'Member',
          status: 'ACTIVE',
        },
      });

      const membership = await prisma.userInstitution.create({
        data: {
          userId: userInactive.id,
          institutionId: inactiveInst.id,
          status: MembershipStatus.INACTIVE,
        },
      });

      try {
        const loginRes = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'inactive-member@rbac-e2e.dev', password: 'Demo1234!' });

        await request(app.getHttpServer())
          .get('/api/v1/auth/authorization-check')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .set('X-Institution-Id', inactiveInst.id)
          .expect(403);
      } finally {
        await prisma.userInstitution.delete({ where: { id: membership.id } });
        await prisma.user.delete({ where: { id: userInactive.id } });
        await prisma.institution.delete({ where: { id: inactiveInst.id } });
      }
    });

    it('should return 403 for inactive institution', async () => {
      const inactiveInst = await prisma.institution.create({
        data: {
          name: 'Inactive Institution RBAC',
          slug: 'inactive-institution-rbac-e2e',
          status: 'INACTIVE',
        },
      });

      const userInactiveInst = await prisma.user.create({
        data: {
          email: 'inactive-inst@rbac-e2e.dev',
          passwordHash: VALID_PASSWORD_HASH,
          firstName: 'Inactive',
          lastName: 'Institution',
          status: 'ACTIVE',
        },
      });

      const membership = await prisma.userInstitution.create({
        data: {
          userId: userInactiveInst.id,
          institutionId: inactiveInst.id,
          status: MembershipStatus.ACTIVE,
        },
      });

      try {
        const loginRes = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'inactive-inst@rbac-e2e.dev', password: 'Demo1234!' });

        await request(app.getHttpServer())
          .get('/api/v1/auth/authorization-check')
          .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
          .set('X-Institution-Id', inactiveInst.id)
          .expect(403);
      } finally {
        await prisma.userInstitution.delete({ where: { id: membership.id } });
        await prisma.user.delete({ where: { id: userInactiveInst.id } });
        await prisma.institution.delete({ where: { id: inactiveInst.id } });
      }
    });

    it('should return 401 for invalid access token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('Authorization', 'Bearer invalid-token')
        .set('X-Institution-Id', demoInstitutionId)
        .expect(401);
    });

    it('should return 401 for expired access token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set(
          'Authorization',
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid',
        )
        .set('X-Institution-Id', demoInstitutionId)
        .expect(401);
    });

    it('Second School teacher: TenantContextGuard allows (has membership) but PermissionGuard denies (no institution:read)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('Authorization', `Bearer ${secondInstTeacherToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('Authorization', `Bearer ${secondInstTeacherToken}`)
        .set('X-Institution-Id', demoInstitutionId)
        .expect(403);
    });

    it('Body institutionId should NOT bypass tenant isolation', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/tenant/select')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ institutionId: secondInstitutionId });

      expect(res.status).not.toBe(200);

      await request(app.getHttpServer())
        .get('/api/v1/auth/authorization-check')
        .set('Authorization', `Bearer ${teacherToken}`)
        .set('X-Institution-Id', secondInstitutionId)
        .expect(403);
    });
  });
});
