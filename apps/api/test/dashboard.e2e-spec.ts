import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient, MembershipStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';

const VALID_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

async function createSecondInstitution(prisma: PrismaClient, suffix: string) {
  const institution = await prisma.institution.create({
    data: {
      name: `Second School ${suffix}`,
      slug: `second-school-${suffix}`,
      status: 'ACTIVE',
    },
  });
  const role = await prisma.role.create({
    data: { name: 'INSTITUTION_ADMIN', roleType: 'TENANT', institutionId: institution.id },
  });
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
  }
  const admin = await prisma.user.create({
    data: {
      email: `admin@${suffix}.dev`,
      passwordHash: VALID_PASSWORD_HASH,
      firstName: 'Second',
      lastName: 'Admin',
      status: 'ACTIVE',
    },
  });
  const membership = await prisma.userInstitution.create({
    data: { userId: admin.id, institutionId: institution.id, status: MembershipStatus.ACTIVE },
  });
  await prisma.userRole.create({
    data: { userInstitutionId: membership.id, roleId: role.id, institutionId: institution.id },
  });
  return { institutionId: institution.id, adminUserId: admin.id };
}

async function cleanupSecondInstitution(
  prisma: PrismaClient,
  institutionId: string,
  adminUserId: string,
) {
  if (!institutionId) return;
  await prisma.rolePermission.deleteMany({ where: { role: { institutionId } } }).catch(() => {});
  await prisma.userRole.deleteMany({ where: { institutionId } }).catch(() => {});
  await prisma.userInstitution.deleteMany({ where: { institutionId } }).catch(() => {});
  await prisma.role.deleteMany({ where: { institutionId } }).catch(() => {});
  await prisma.institution.delete({ where: { id: institutionId } }).catch(() => {});
  if (adminUserId) {
    await prisma.user.deleteMany({ where: { id: adminUserId } }).catch(() => {});
  }
}

describe('Dashboard Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let demoInstitutionId: string;
  let secondInstitutionId: string;

  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let studentToken: string;
  let secondAdminToken: string;
  const adminUserIds: string[] = [];

  const dashboard = (token: string, institutionId: string) =>
    request(app.getHttpServer())
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Institution-Id', institutionId);

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

    const demo = await prisma.institution.findUnique({ where: { slug: 'demo-school' } });
    demoInstitutionId = demo!.id;

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

    const secondToken = `dash${Date.now().toString(36)}`;
    const second = await createSecondInstitution(prisma, secondToken);
    secondInstitutionId = second.institutionId;
    secondAdminToken = await login(`admin@${secondToken}.dev`);
    adminUserIds.push(second.adminUserId);
  });

  afterAll(async () => {
    await cleanupSecondInstitution(prisma, secondInstitutionId, adminUserIds[0] ?? '').catch(
      () => {},
    );
    await app.close();
    await prisma.$disconnect();
  });

  it('returns the institutional dashboard for an INSTITUTION_ADMIN', async () => {
    const res = await dashboard(adminToken, demoInstitutionId).expect(200);
    expect(res.body.role).toBe('INSTITUTION_ADMIN');
    expect(res.body.stats.students).toBeGreaterThanOrEqual(0);
    expect(res.body.stats.teachers).toBeGreaterThanOrEqual(0);
    expect(typeof res.body.stats.courses).toBe('number');
    expect(Array.isArray(res.body.recentNotifications)).toBe(true);
    expect(Array.isArray(res.body.pendingSignatures)).toBe(true);
    expect(Array.isArray(res.body.followUps)).toBe(true);
    expect(Array.isArray(res.body.pendingCommitments)).toBe(true);
  });

  it('returns the teacher dashboard with the teacher courses', async () => {
    const res = await dashboard(teacherToken, demoInstitutionId).expect(200);
    expect(res.body.role).toBe('TEACHER');
    expect(Array.isArray(res.body.courses)).toBe(true);
    expect(typeof res.body.stats.courses).toBe('number');
  });

  it('returns the parent dashboard with their children', async () => {
    const res = await dashboard(parentToken, demoInstitutionId).expect(200);
    expect(res.body.role).toBe('PARENT');
    expect(Array.isArray(res.body.children)).toBe(true);
  });

  it('returns the student dashboard', async () => {
    const res = await dashboard(studentToken, demoInstitutionId).expect(200);
    expect(res.body.role).toBe('STUDENT');
    expect(typeof res.body.stats).toBe('object');
    expect(Array.isArray(res.body.courses)).toBe(true);
  });

  it('scopes the second-institution admin to its own (empty) data', async () => {
    const res = await dashboard(secondAdminToken, secondInstitutionId).expect(200);
    expect(res.body.role).toBe('INSTITUTION_ADMIN');
    expect(res.body.stats.students).toBe(0);
  });

  it('denies cross-tenant access (demo student cannot read second school)', async () => {
    await dashboard(studentToken, secondInstitutionId).expect(403);
  });

  it('denies access without a tenant context header', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
  });

  it('denies access without authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboard')
      .set('X-Institution-Id', demoInstitutionId)
      .expect(401);
  });
});
