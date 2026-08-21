import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // --- Permissions (global definitions) ---
  const permissionData = [
    { code: 'institution:read', module: 'institution', description: 'Read institution data' },
    { code: 'institution:update', module: 'institution', description: 'Update institution settings' },
    { code: 'users:read', module: 'users', description: 'List and read users' },
    { code: 'users:create', module: 'users', description: 'Create new users' },
    { code: 'users:update', module: 'users', description: 'Update user data' },
    { code: 'users:delete', module: 'users', description: 'Deactivate or delete users' },
    { code: 'roles:read', module: 'roles', description: 'List and read roles' },
    { code: 'roles:manage', module: 'roles', description: 'Create, update, delete roles' },
    { code: 'grades:read', module: 'grades', description: 'List and read grades' },
    { code: 'grades:manage', module: 'grades', description: 'CRUD grades' },
    { code: 'courses:read', module: 'courses', description: 'List and read courses' },
    { code: 'courses:manage', module: 'courses', description: 'CRUD courses' },
    { code: 'subjects:read', module: 'subjects', description: 'List and read subjects' },
    { code: 'subjects:manage', module: 'subjects', description: 'CRUD subjects' },
    { code: 'students:read', module: 'students', description: 'List and read students' },
    { code: 'students:manage', module: 'students', description: 'CRUD students and enrollments' },
    { code: 'schedules:read', module: 'schedules', description: 'Read schedules' },
    { code: 'schedules:manage', module: 'schedules', description: 'CRUD schedules' },
    { code: 'tasks:read', module: 'tasks', description: 'Read tasks' },
    { code: 'tasks:create', module: 'tasks', description: 'Create tasks' },
    { code: 'tasks:update', module: 'tasks', description: 'Update tasks' },
    { code: 'tasks:delete', module: 'tasks', description: 'Delete tasks' },
    { code: 'communications:read', module: 'communications', description: 'Read communications' },
    { code: 'communications:create', module: 'communications', description: 'Create communications' },
    { code: 'communications:send_bulk', module: 'communications', description: 'Send bulk communications' },
    { code: 'signatures:read', module: 'signatures', description: 'Read signatures' },
    { code: 'signatures:request', module: 'signatures', description: 'Request signatures' },
    { code: 'signatures:sign', module: 'signatures', description: 'Sign documents' },
    { code: 'notifications:read', module: 'notifications', description: 'Read notifications' },
    { code: 'audit:read', module: 'audit', description: 'Read audit logs' },
    { code: 'files:upload', module: 'files', description: 'Upload files' },
    { code: 'files:read', module: 'files', description: 'Read/download files' },
  ];

  for (const p of permissionData) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }
  console.log(`  Upserted ${permissionData.length} permissions`);

  // --- Roles (tenant-scoped) ---
  const institutionAdminRole = await prisma.role.upsert({
    where: { name_institutionId: { name: 'INSTITUTION_ADMIN', institutionId: null } },
    update: {},
    create: {
      name: 'INSTITUTION_ADMIN',
      description: 'Administrator of an institution',
      isSystem: true,
    },
  });

  const teacherRole = await prisma.role.upsert({
    where: { name_institutionId: { name: 'TEACHER', institutionId: null } },
    update: {},
    create: {
      name: 'TEACHER',
      description: 'Teacher assigned to courses',
      isSystem: true,
    },
  });

  const parentRole = await prisma.role.upsert({
    where: { name_institutionId: { name: 'PARENT', institutionId: null } },
    update: {},
    create: {
      name: 'PARENT',
      description: 'Parent or guardian',
      isSystem: true,
    },
  });

  const studentRole = await prisma.role.upsert({
    where: { name_institutionId: { name: 'STUDENT', institutionId: null } },
    update: {},
    create: {
      name: 'STUDENT',
      description: 'Enrolled student',
      isSystem: true,
    },
  });

  console.log('  Upserted tenant-scoped roles: INSTITUTION_ADMIN, TEACHER, PARENT, STUDENT');

  // --- Super Admin role (global/platform) ---
  const superAdminRole = await prisma.role.upsert({
    where: { name_institutionId: { name: 'SUPER_ADMIN', institutionId: null } },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
      description: 'Platform super administrator (global scope)',
      isSystem: true,
    },
  });
  console.log('  Upserted global role: SUPER_ADMIN');

  // --- Demo Institution ---
  const demoInstitution = await prisma.institution.upsert({
    where: { slug: 'demo-school' },
    update: {},
    create: {
      name: 'Demo School',
      slug: 'demo-school',
      status: 'ACTIVE',
    },
  });
  console.log(`  Upserted institution: ${demoInstitution.name} (${demoInstitution.id})`);

  // --- Demo Super Admin User ---
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@agenda.dev' },
    update: {},
    create: {
      email: 'superadmin@agenda.dev',
      passwordHash: '$2b$10$placeholder_hash_for_demo_only_not_a_real_password',
      firstName: 'Super',
      lastName: 'Admin',
      status: 'ACTIVE',
    },
  });

  await prisma.globalUserRole.upsert({
    where: { userId_roleId: { userId: superAdminUser.id, roleId: superAdminRole.id } },
    update: {},
    create: {
      userId: superAdminUser.id,
      roleId: superAdminRole.id,
    },
  });
  console.log(`  Created super admin user: ${superAdminUser.email}`);

  // --- Demo Institution Admin User ---
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo-school.dev' },
    update: {},
    create: {
      email: 'admin@demo-school.dev',
      passwordHash: '$2b$10$placeholder_hash_for_demo_only_not_a_real_password',
      firstName: 'Admin',
      lastName: 'User',
      status: 'ACTIVE',
    },
  });

  const adminMembership = await prisma.userInstitution.upsert({
    where: {
      userId_institutionId: {
        userId: adminUser.id,
        institutionId: demoInstitution.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      institutionId: demoInstitution.id,
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: {
      userInstitutionId_roleId: {
        userInstitutionId: adminMembership.id,
        roleId: institutionAdminRole.id,
      },
    },
    update: {},
    create: {
      userInstitutionId: adminMembership.id,
      roleId: institutionAdminRole.id,
    },
  });
  console.log(`  Created institution admin user: ${adminUser.email}`);

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
