import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/app.module';

export const VALID_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$Icmn9qeFuyjxVlW8/E00Rg$LdTYcWJFXdign29Yi9I7zJYQENOQAE6SISHhgS8vgpI';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaClient;
}

export async function createTestApp(): Promise<TestContext> {
  const prisma = new PrismaClient();
  await prisma.$connect();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();

  return { app, prisma };
}

export async function closeTestApp(ctx: TestContext): Promise<void> {
  await ctx.app.close();
  await ctx.prisma.$disconnect();
}

export async function getDemoIds(prisma: PrismaClient): Promise<{
  institutionId: string;
  courseId: string;
  subjectId: string;
  studentIds: string[];
}> {
  const institution = await prisma.institution.findUnique({
    where: { slug: 'demo-school' },
  });

  const course = await prisma.course.findFirst({
    where: { institutionId: institution!.id },
  });

  const subject = await prisma.subject.findFirst({
    where: { institutionId: institution!.id },
  });

  const students = await prisma.student.findMany({
    where: { institutionId: institution!.id },
    take: 3,
  });

  return {
    institutionId: institution!.id,
    courseId: course!.id,
    subjectId: subject!.id,
    studentIds: students.map((s) => s.id),
  };
}

export async function login(
  app: INestApplication,
  email: string,
  password = 'Demo1234!',
): Promise<string> {
  const request = (await import('supertest')).default;
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password });
  return res.body.accessToken;
}

export async function createSecondInstitution(prisma: PrismaClient, suffix: string) {
  const institution = await prisma.institution.create({
    data: {
      name: `Second School ${suffix}`,
      slug: `second-school-${suffix}`,
      status: 'ACTIVE',
    },
  });

  const role = await prisma.role.create({
    data: {
      name: 'INSTITUTION_ADMIN',
      roleType: 'TENANT',
      institutionId: institution.id,
    },
  });

  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: perm.id },
    });
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
    data: {
      userId: admin.id,
      institutionId: institution.id,
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.create({
    data: {
      userInstitutionId: membership.id,
      roleId: role.id,
      institutionId: institution.id,
    },
  });

  return { institution, admin, membership, role };
}

export async function cleanupSecondInstitution(prisma: PrismaClient, institutionId: string) {
  await prisma.rolePermission.deleteMany({
    where: { role: { institutionId } },
  }).catch(() => {});
  await prisma.userRole.deleteMany({
    where: { institutionId },
  }).catch(() => {});
  await prisma.userInstitution.deleteMany({
    where: { institutionId },
  }).catch(() => {});
  await prisma.role.deleteMany({
    where: { institutionId },
  }).catch(() => {});
  await prisma.institution.delete({ where: { id: institutionId } }).catch(() => {});
}
