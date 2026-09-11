import { PrismaClient, RoleType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo1234!';

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

const ALL_PERMISSIONS = [
  'institution:read', 'institution:update', 'institution:manage',
  'users:read', 'users:create', 'users:update', 'users:delete', 'users:manage',
  'memberships:read', 'memberships:manage',
  'roles:read', 'roles:manage',
  'grades:read', 'grades:manage',
  'courses:read', 'courses:manage',
  'areas:read', 'areas:manage',
  'subjects:read', 'subjects:manage',
  'students:read', 'students:manage',
  'schedules:read', 'schedules:manage',
  'tasks:read', 'tasks:create', 'tasks:update', 'tasks:delete', 'tasks:manage',
  'communications:read', 'communications:create', 'communications:manage', 'communications:send_bulk',
  'signatures:read', 'signatures:request', 'signatures:sign', 'signatures:manage',
  'notifications:read', 'notifications:manage', 'audit:read', 'files:upload', 'files:read', 'files:manage',
  'school-grades:read', 'school-grades:manage',
  'academic-periods:read', 'academic-periods:manage', 'academic-periods:close',
  'guardians:read', 'guardians:manage',
  'enrollments:read', 'enrollments:manage',
  'teacher-assignments:read', 'teacher-assignments:manage',
  'agenda:read', 'agenda:create', 'agenda:update', 'agenda:delete',
  'student-follow-ups:read', 'student-follow-ups:create', 'student-follow-ups:update',
  'student-follow-ups:close', 'student-follow-ups:escalate', 'student-follow-ups:follow_up',
  'student-follow-ups:commit', 'student-follow-ups:attach', 'student-follow-ups:manage',
  'student-follow-ups:stats', 'student-follow-ups:categories',
  'attendance:read', 'attendance:create', 'attendance:update', 'attendance:delete',
  'attendance:manage', 'attendance:stats',
  'reports:read', 'reports:export',
];

const INSTITUTION_ADMIN_PERMISSIONS = [
  'institution:read', 'institution:update', 'institution:manage',
  'users:read', 'users:create', 'users:update', 'users:delete', 'users:manage',
  'memberships:read', 'memberships:manage',
  'roles:read', 'roles:manage',
  'grades:read', 'grades:manage',
  'courses:read', 'courses:manage',
  'areas:read', 'areas:manage',
  'subjects:read', 'subjects:manage',
  'students:read', 'students:manage',
  'schedules:read', 'schedules:manage',
  'tasks:read', 'tasks:create', 'tasks:update', 'tasks:delete', 'tasks:manage',
  'communications:read', 'communications:create', 'communications:manage', 'communications:send_bulk',
  'signatures:read', 'signatures:request', 'signatures:sign', 'signatures:manage',
  'notifications:read', 'notifications:manage', 'audit:read', 'files:upload', 'files:read', 'files:manage',
  'school-grades:read', 'school-grades:manage',
  'academic-periods:read', 'academic-periods:manage', 'academic-periods:close',
  'guardians:read', 'guardians:manage',
  'enrollments:read', 'enrollments:manage',
  'teacher-assignments:read', 'teacher-assignments:manage',
  'agenda:read', 'agenda:create', 'agenda:update', 'agenda:delete',
  'student-follow-ups:read', 'student-follow-ups:create', 'student-follow-ups:update',
  'student-follow-ups:close', 'student-follow-ups:escalate', 'student-follow-ups:follow_up',
  'student-follow-ups:commit', 'student-follow-ups:attach', 'student-follow-ups:manage',
  'student-follow-ups:stats', 'student-follow-ups:categories',
  'attendance:read', 'attendance:create', 'attendance:update', 'attendance:delete',
  'attendance:manage', 'attendance:stats',
  'reports:read', 'reports:export',
];

const TEACHER_PERMISSIONS = [
  'courses:read', 'courses:manage',
  'areas:read',
  'subjects:read', 'subjects:manage',
  'students:read',
  'grades:read', 'grades:manage',
  'tasks:read', 'tasks:create', 'tasks:update', 'tasks:delete', 'tasks:manage',
  'schedules:read',
  'communications:read', 'communications:create',
  'signatures:read',
  'notifications:read',
  'files:upload', 'files:read', 'files:manage',
  'school-grades:read',
  'academic-periods:read',
  'teacher-assignments:read',
  'agenda:read', 'agenda:create', 'agenda:update',
  'student-follow-ups:read', 'student-follow-ups:create', 'student-follow-ups:update',
  'student-follow-ups:close', 'student-follow-ups:escalate', 'student-follow-ups:follow_up',
  'student-follow-ups:commit', 'student-follow-ups:attach',
  'attendance:read', 'attendance:create', 'attendance:update',
  'reports:read', 'reports:export',
];

const DIRECTOR_DE_GRUPO_PERMISSIONS = Array.from(
  new Set([
    ...TEACHER_PERMISSIONS,
    'enrollments:read',
    'attendance:stats',
    'student-follow-ups:manage',
  ]),
);

const PARENT_PERMISSIONS = [
  'students:read',
  'grades:read',
  'schedules:read',
  'tasks:read',
  'communications:read', 'communications:create',
  'signatures:read', 'signatures:sign',
  'notifications:read',
  'files:read',
  'school-grades:read',
  'academic-periods:read',
  'guardians:read',
  'enrollments:read',
  'agenda:read',
  'student-follow-ups:read',
  'attendance:read',
  'reports:read',
];

const STUDENT_PERMISSIONS = [
  'students:read',
  'tasks:read', 'tasks:update',
  'grades:read',
  'schedules:read',
  'communications:read',
  'notifications:read',
  'files:read',
  'school-grades:read',
  'academic-periods:read',
  'enrollments:read',
  'agenda:read',
  'student-follow-ups:read',
  'attendance:read',
  'reports:read',
];

const RECTOR_PERMISSIONS = [
  'institution:read',
  'users:read',
  'memberships:read',
  'roles:read',
  'grades:read', 'grades:manage',
  'courses:read', 'courses:manage',
  'areas:read', 'areas:manage',
  'subjects:read', 'subjects:manage',
  'students:read', 'students:manage',
  'schedules:read', 'schedules:manage',
  'tasks:read', 'tasks:create', 'tasks:update', 'tasks:manage',
  'communications:read', 'communications:create', 'communications:manage', 'communications:send_bulk',
  'signatures:read', 'signatures:request', 'signatures:manage',
  'notifications:read', 'notifications:manage', 'audit:read', 'files:read', 'files:upload', 'files:manage',
  'school-grades:read', 'school-grades:manage',
  'academic-periods:read', 'academic-periods:manage', 'academic-periods:close',
  'guardians:read',
  'enrollments:read', 'enrollments:manage',
  'teacher-assignments:read', 'teacher-assignments:manage',
  'agenda:read', 'agenda:create', 'agenda:update', 'agenda:delete',
  'student-follow-ups:read', 'student-follow-ups:create', 'student-follow-ups:update',
  'student-follow-ups:close', 'student-follow-ups:escalate', 'student-follow-ups:follow_up',
  'student-follow-ups:commit', 'student-follow-ups:attach', 'student-follow-ups:manage',
  'student-follow-ups:stats', 'student-follow-ups:categories',
  'attendance:read', 'attendance:manage', 'attendance:stats',
  'reports:read', 'reports:export',
];

const COORDINADOR_ACADEMICO_PERMISSIONS = [
  'institution:read',
  'courses:read', 'courses:manage',
  'areas:read', 'areas:manage',
  'subjects:read', 'subjects:manage',
  'students:read',
  'grades:read', 'grades:manage',
  'schedules:read', 'schedules:manage',
  'tasks:read', 'tasks:create', 'tasks:update', 'tasks:manage',
  'attendance:read', 'attendance:create', 'attendance:update', 'attendance:stats',
  'teacher-assignments:read', 'teacher-assignments:manage',
  'academic-periods:read', 'academic-periods:manage', 'academic-periods:close',
  'school-grades:read', 'school-grades:manage',
  'enrollments:read', 'enrollments:manage',
  'guardians:read',
  'notifications:read', 'notifications:manage',
  'files:read', 'files:upload', 'files:manage',
  'agenda:read', 'agenda:create', 'agenda:update',
  'student-follow-ups:read', 'student-follow-ups:stats', 'student-follow-ups:categories',
  'reports:read', 'reports:export',
];

const COORDINADOR_CONVIVENCIA_PERMISSIONS = [
  'institution:read',
  'students:read', 'students:manage',
  'courses:read', 'subjects:read',
  'schedules:read',
  'communications:read', 'communications:create', 'communications:manage',
  'notifications:read', 'notifications:manage',
  'files:read', 'files:upload',
  'agenda:read', 'agenda:create', 'agenda:update',
  'attendance:read', 'attendance:stats',
  'guardians:read',
  'school-grades:read', 'academic-periods:read',
  'student-follow-ups:read', 'student-follow-ups:create', 'student-follow-ups:update',
  'student-follow-ups:close', 'student-follow-ups:escalate', 'student-follow-ups:follow_up',
  'student-follow-ups:commit', 'student-follow-ups:attach', 'student-follow-ups:manage',
  'student-follow-ups:stats', 'student-follow-ups:categories',
  'reports:read', 'reports:export',
];

const ORIENTADOR_PERMISSIONS = [
  'institution:read',
  'students:read',
  'courses:read', 'subjects:read', 'schedules:read',
  'grades:read',
  'attendance:read', 'attendance:stats',
  'guardians:read',
  'school-grades:read', 'academic-periods:read', 'enrollments:read',
  'notifications:read', 'notifications:manage',
  'files:read', 'files:upload',
  'agenda:read', 'agenda:create', 'agenda:update',
  'communications:read', 'communications:create',
  'student-follow-ups:read', 'student-follow-ups:create', 'student-follow-ups:update',
  'student-follow-ups:close', 'student-follow-ups:escalate', 'student-follow-ups:follow_up',
  'student-follow-ups:commit', 'student-follow-ups:attach', 'student-follow-ups:manage',
  'student-follow-ups:stats', 'student-follow-ups:categories',
  'reports:read', 'reports:export',
];

const PSICOLOGO_PERMISSIONS = [
  'institution:read',
  'students:read',
  'courses:read', 'subjects:read', 'schedules:read',
  'grades:read',
  'attendance:read',
  'guardians:read',
  'school-grades:read', 'academic-periods:read', 'enrollments:read',
  'notifications:read', 'files:read', 'files:upload',
  'agenda:read',
  'communications:read',
  'student-follow-ups:read', 'student-follow-ups:create', 'student-follow-ups:update',
  'student-follow-ups:close', 'student-follow-ups:escalate', 'student-follow-ups:follow_up',
  'student-follow-ups:commit', 'student-follow-ups:attach', 'student-follow-ups:manage',
  'student-follow-ups:stats', 'student-follow-ups:categories',
  'reports:read',
];

async function assignPermissions(roleId: string, codes: string[]): Promise<void> {
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  for (const code of codes) {
    const perm = await prisma.permission.findUnique({ where: { code } });
    if (perm) {
      await prisma.rolePermission.create({ data: { roleId, permissionId: perm.id } });
    }
  }
}

async function findOrCreateGlobalRole(name: string, desc: string) {
  const existing = await prisma.role.findFirst({ where: { name, institutionId: null } });
  if (existing) {
    if (existing.roleType !== RoleType.GLOBAL) {
      return prisma.role.update({ where: { id: existing.id }, data: { roleType: RoleType.GLOBAL } });
    }
    return existing;
  }
  return prisma.role.create({ data: { name, description: desc, isSystem: true, roleType: RoleType.GLOBAL } });
}

async function findOrCreateTemplateRole(name: string, desc: string) {
  const existing = await prisma.role.findFirst({ where: { name, institutionId: null } });
  if (existing) {
    if (existing.roleType !== RoleType.TEMPLATE) {
      return prisma.role.update({ where: { id: existing.id }, data: { roleType: RoleType.TEMPLATE } });
    }
    return existing;
  }
  return prisma.role.create({ data: { name, description: desc, isSystem: true, roleType: RoleType.TEMPLATE } });
}

async function findOrCreateTenantRole(name: string, desc: string, institutionId: string) {
  const existing = await prisma.role.findFirst({ where: { name, institutionId } });
  if (existing) return existing;
  return prisma.role.create({
    data: { name, description: desc, isSystem: true, roleType: RoleType.TENANT, institutionId },
  });
}

async function main(): Promise<void> {
  console.log('Seeding database...\n');

  // 1. PERMISSIONS
  const permissionData = [
    { code: 'institution:read', module: 'institution', description: 'Read institution data' },
    { code: 'institution:update', module: 'institution', description: 'Update institution settings' },
    { code: 'institution:manage', module: 'institution', description: 'Create and manage institutions' },
    { code: 'users:read', module: 'users', description: 'List and read users' },
    { code: 'users:create', module: 'users', description: 'Create new users' },
    { code: 'users:update', module: 'users', description: 'Update user data' },
    { code: 'users:delete', module: 'users', description: 'Deactivate or delete users' },
    { code: 'users:manage', module: 'users', description: 'Full user management' },
    { code: 'memberships:read', module: 'memberships', description: 'List and read memberships' },
    { code: 'memberships:manage', module: 'memberships', description: 'Link/unlink users to institutions' },
    { code: 'roles:read', module: 'roles', description: 'List and read roles' },
    { code: 'roles:manage', module: 'roles', description: 'Create, update, delete roles' },
    { code: 'grades:read', module: 'grades', description: 'List and read grades' },
    { code: 'grades:manage', module: 'grades', description: 'CRUD grades' },
    { code: 'courses:read', module: 'courses', description: 'List and read courses' },
    { code: 'courses:manage', module: 'courses', description: 'CRUD courses' },
    { code: 'areas:read', module: 'areas', description: 'List and read areas' },
    { code: 'areas:manage', module: 'areas', description: 'CRUD areas' },
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
    { code: 'tasks:manage', module: 'tasks', description: 'CRUD tasks' },
    { code: 'communications:read', module: 'communications', description: 'Read communications' },
    { code: 'communications:create', module: 'communications', description: 'Create communications' },
    { code: 'communications:manage', module: 'communications', description: 'CRUD and publish communications' },
    { code: 'communications:send_bulk', module: 'communications', description: 'Send bulk communications' },
    { code: 'signatures:read', module: 'signatures', description: 'Read signatures' },
    { code: 'signatures:request', module: 'signatures', description: 'Request signatures' },
    { code: 'signatures:sign', module: 'signatures', description: 'Sign documents' },
    { code: 'signatures:manage', module: 'signatures', description: 'CRUD signature requests' },
    { code: 'notifications:read', module: 'notifications', description: 'Read notifications' },
    { code: 'notifications:manage', module: 'notifications', description: 'CRUD notifications' },
    { code: 'audit:read', module: 'audit', description: 'Read audit logs' },
    { code: 'files:upload', module: 'files', description: 'Upload files' },
    { code: 'files:read', module: 'files', description: 'Read/download files' },
    { code: 'files:manage', module: 'files', description: 'Delete/manage files' },
    { code: 'school-grades:read', module: 'school-grades', description: 'List and read school grades' },
    { code: 'school-grades:manage', module: 'school-grades', description: 'CRUD school grades' },
    { code: 'academic-periods:read', module: 'academic-periods', description: 'List and read academic periods' },
    { code: 'academic-periods:manage', module: 'academic-periods', description: 'CRUD academic periods' },
    { code: 'academic-periods:close', module: 'academic-periods', description: 'Close academic periods' },
    { code: 'guardians:read', module: 'guardians', description: 'Read guardian-student links' },
    { code: 'guardians:manage', module: 'guardians', description: 'Link/unlink guardians to students' },
    { code: 'enrollments:read', module: 'enrollments', description: 'List and read enrollments' },
    { code: 'enrollments:manage', module: 'enrollments', description: 'CRUD enrollments' },
    { code: 'teacher-assignments:read', module: 'teacher-assignments', description: 'List and read teacher assignments' },
    { code: 'teacher-assignments:manage', module: 'teacher-assignments', description: 'CRUD teacher assignments' },
    { code: 'agenda:read', module: 'agenda', description: 'Read agenda/calendar view' },
    { code: 'agenda:create', module: 'agenda', description: 'Create agenda events' },
    { code: 'agenda:update', module: 'agenda', description: 'Update agenda events' },
    { code: 'agenda:delete', module: 'agenda', description: 'Cancel/delete agenda events' },
    { code: 'student-follow-ups:read', module: 'student-follow-ups', description: 'Read student follow-up records' },
    { code: 'student-follow-ups:create', module: 'student-follow-ups', description: 'Create student follow-up records' },
    { code: 'student-follow-ups:update', module: 'student-follow-ups', description: 'Update student follow-up records' },
    { code: 'student-follow-ups:close', module: 'student-follow-ups', description: 'Close student follow-up records' },
    { code: 'student-follow-ups:escalate', module: 'student-follow-ups', description: 'Escalate student follow-up records' },
    { code: 'student-follow-ups:follow_up', module: 'student-follow-ups', description: 'Add follow-up entries to records' },
    { code: 'student-follow-ups:commit', module: 'student-follow-ups', description: 'Create commitments in follow-up records' },
    { code: 'student-follow-ups:attach', module: 'student-follow-ups', description: 'Attach files to follow-up records' },
    { code: 'student-follow-ups:manage', module: 'student-follow-ups', description: 'Full management of student follow-up module' },
    { code: 'student-follow-ups:stats', module: 'student-follow-ups', description: 'View student follow-up statistics' },
    { code: 'student-follow-ups:categories', module: 'student-follow-ups', description: 'Manage follow-up categories' },
    { code: 'attendance:read', module: 'attendance', description: 'Read attendance records' },
    { code: 'attendance:create', module: 'attendance', description: 'Register attendance records' },
    { code: 'attendance:update', module: 'attendance', description: 'Update attendance records' },
    { code: 'attendance:delete', module: 'attendance', description: 'Delete attendance records' },
    { code: 'attendance:manage', module: 'attendance', description: 'Full management of attendance module' },
    { code: 'attendance:stats', module: 'attendance', description: 'View attendance statistics' },
    { code: 'reports:read', module: 'reports', description: 'View academic reports and bulletins' },
    { code: 'reports:export', module: 'reports', description: 'Export academic reports (PDF/CSV)' },
  ];

  for (const p of permissionData) {
    await prisma.permission.upsert({ where: { code: p.code }, update: {}, create: p });
  }
  console.log(`  Upserted ${permissionData.length} permissions`);

  // 2. TEMPLATE ROLES
  const superAdmin = await findOrCreateGlobalRole('SUPER_ADMIN', 'Platform super administrator (global scope)');
  const tplAdmin = await findOrCreateTemplateRole('INSTITUTION_ADMIN', 'Administrator of an institution (template)');
  const tplTeacher = await findOrCreateTemplateRole('TEACHER', 'Teacher assigned to courses (template)');
  const tplParent = await findOrCreateTemplateRole('PARENT', 'Parent or guardian (template)');
  const tplStudent = await findOrCreateTemplateRole('STUDENT', 'Enrolled student (template)');
  const tplRector = await findOrCreateTemplateRole('RECTOR', 'School principal (template)');
  const tplCoordAcad = await findOrCreateTemplateRole('COORDINADOR_ACADEMICO', 'Academic coordinator (template)');
  const tplCoordConv = await findOrCreateTemplateRole('COORDINADOR_CONVIVENCIA', 'Coexistence coordinator (template)');
  const tplOrientador = await findOrCreateTemplateRole('ORIENTADOR', 'School counselor (template)');
  const tplPsicologo = await findOrCreateTemplateRole('PSICOLOGO', 'Psychologist (template)');
  const tplDirectorGrupo = await findOrCreateTemplateRole('DIRECTOR_DE_GRUPO', 'Group director (template)');

  console.log('  Created template roles: SUPER_ADMIN(GLOBAL), INSTITUTION_ADMIN(TEMPLATE), TEACHER(TEMPLATE), PARENT(TEMPLATE), STUDENT(TEMPLATE), RECTOR(TEMPLATE), COORDINADOR_ACADEMICO(TEMPLATE), COORDINADOR_CONVIVENCIA(TEMPLATE), ORIENTADOR(TEMPLATE), PSICOLOGO(TEMPLATE)');

  // 3. ASSIGN PERMISSIONS TO TEMPLATES
  await assignPermissions(superAdmin.id, ALL_PERMISSIONS);
  console.log('  Assigned 32 permissions to SUPER_ADMIN');

  await assignPermissions(tplAdmin.id, INSTITUTION_ADMIN_PERMISSIONS);
  console.log(`  Assigned ${INSTITUTION_ADMIN_PERMISSIONS.length} permissions to INSTITUTION_ADMIN template`);

  await assignPermissions(tplTeacher.id, TEACHER_PERMISSIONS);
  console.log(`  Assigned ${TEACHER_PERMISSIONS.length} permissions to TEACHER template`);

  await assignPermissions(tplParent.id, PARENT_PERMISSIONS);
  console.log(`  Assigned ${PARENT_PERMISSIONS.length} permissions to PARENT template`);

  await assignPermissions(tplStudent.id, STUDENT_PERMISSIONS);
  console.log(`  Assigned ${STUDENT_PERMISSIONS.length} permissions to STUDENT template`);

  await assignPermissions(tplRector.id, RECTOR_PERMISSIONS);
  console.log(`  Assigned ${RECTOR_PERMISSIONS.length} permissions to RECTOR template`);

  await assignPermissions(tplCoordAcad.id, COORDINADOR_ACADEMICO_PERMISSIONS);
  console.log(`  Assigned ${COORDINADOR_ACADEMICO_PERMISSIONS.length} permissions to COORDINADOR_ACADEMICO template`);

  await assignPermissions(tplCoordConv.id, COORDINADOR_CONVIVENCIA_PERMISSIONS);
  console.log(`  Assigned ${COORDINADOR_CONVIVENCIA_PERMISSIONS.length} permissions to COORDINADOR_CONVIVENCIA template`);

  await assignPermissions(tplOrientador.id, ORIENTADOR_PERMISSIONS);
  console.log(`  Assigned ${ORIENTADOR_PERMISSIONS.length} permissions to ORIENTADOR template`);

  await assignPermissions(tplPsicologo.id, PSICOLOGO_PERMISSIONS);
  console.log(`  Assigned ${PSICOLOGO_PERMISSIONS.length} permissions to PSICOLOGO template`);

  await assignPermissions(tplDirectorGrupo.id, DIRECTOR_DE_GRUPO_PERMISSIONS);
  console.log(`  Assigned ${DIRECTOR_DE_GRUPO_PERMISSIONS.length} permissions to DIRECTOR_DE_GRUPO template`);

  // 4. DEMO INSTITUTION
  const demoInstitution = await prisma.institution.upsert({
    where: { slug: 'demo-school' },
    update: {},
    create: { name: 'Demo School', slug: 'demo-school', status: 'ACTIVE' },
  });
  console.log(`\n  Upserted institution: ${demoInstitution.name} (${demoInstitution.id})`);

  // 5. TENANT ROLES FOR DEMO SCHOOL
  const demoAdmin = await findOrCreateTenantRole('INSTITUTION_ADMIN', 'Administrator of Demo School', demoInstitution.id);
  const demoTeacher = await findOrCreateTenantRole('TEACHER', 'Teacher at Demo School', demoInstitution.id);
  const demoParent = await findOrCreateTenantRole('PARENT', 'Parent at Demo School', demoInstitution.id);
  const demoStudent = await findOrCreateTenantRole('STUDENT', 'Student at Demo School', demoInstitution.id);
  const demoRector = await findOrCreateTenantRole('RECTOR', 'Principal at Demo School', demoInstitution.id);
  const demoCoordAcad = await findOrCreateTenantRole('COORDINADOR_ACADEMICO', 'Academic coordinator at Demo School', demoInstitution.id);
  const demoCoordConv = await findOrCreateTenantRole('COORDINADOR_CONVIVENCIA', 'Coexistence coordinator at Demo School', demoInstitution.id);
  const demoOrientador = await findOrCreateTenantRole('ORIENTADOR', 'Counselor at Demo School', demoInstitution.id);
  const demoPsicologo = await findOrCreateTenantRole('PSICOLOGO', 'Psychologist at Demo School', demoInstitution.id);
  const demoDirectorGrupo = await findOrCreateTenantRole('DIRECTOR_DE_GRUPO', 'Group director at Demo School', demoInstitution.id);

  console.log('  Created tenant roles for Demo School: INSTITUTION_ADMIN, TEACHER, PARENT, STUDENT, RECTOR, COORDINADOR_ACADEMICO, COORDINADOR_CONVIVENCIA, ORIENTADOR, PSICOLOGO');

  // 6. ASSIGN PERMISSIONS TO TENANT ROLES
  await assignPermissions(demoAdmin.id, INSTITUTION_ADMIN_PERMISSIONS);
  await assignPermissions(demoTeacher.id, TEACHER_PERMISSIONS);
  await assignPermissions(demoParent.id, PARENT_PERMISSIONS);
  await assignPermissions(demoStudent.id, STUDENT_PERMISSIONS);
  await assignPermissions(demoRector.id, RECTOR_PERMISSIONS);
  await assignPermissions(demoCoordAcad.id, COORDINADOR_ACADEMICO_PERMISSIONS);
  await assignPermissions(demoCoordConv.id, COORDINADOR_CONVIVENCIA_PERMISSIONS);
  await assignPermissions(demoOrientador.id, ORIENTADOR_PERMISSIONS);
  await assignPermissions(demoPsicologo.id, PSICOLOGO_PERMISSIONS);
  await assignPermissions(demoDirectorGrupo.id, DIRECTOR_DE_GRUPO_PERMISSIONS);
  console.log('  Assigned permissions to Demo School tenant roles');

  // 7. DEMO USERS
  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);

  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@agenda.dev' },
    update: {},
    create: {
      email: 'superadmin@agenda.dev',
      passwordHash: demoPasswordHash,
      firstName: 'Super', lastName: 'Admin', status: 'ACTIVE',
    },
  });

  await prisma.globalUserRole.upsert({
    where: { userId_roleId: { userId: superAdminUser.id, roleId: superAdmin.id } },
    update: {},
    create: { userId: superAdminUser.id, roleId: superAdmin.id },
  });
  console.log(`\n  Created super admin: ${superAdminUser.email}`);

  // Institution Admin at Demo School
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo-school.dev' },
    update: {},
    create: {
      email: 'admin@demo-school.dev',
      passwordHash: demoPasswordHash,
      firstName: 'Admin', lastName: 'User', status: 'ACTIVE',
    },
  });

  const adminMembership = await prisma.userInstitution.upsert({
    where: { userId_institutionId: { userId: adminUser.id, institutionId: demoInstitution.id } },
    update: {},
    create: { userId: adminUser.id, institutionId: demoInstitution.id, status: 'ACTIVE' },
  });

  await prisma.userRole.upsert({
    where: { userInstitutionId_roleId: { userInstitutionId: adminMembership.id, roleId: demoAdmin.id } },
    update: {},
    create: { userInstitutionId: adminMembership.id, roleId: demoAdmin.id, institutionId: demoInstitution.id },
  });
  console.log(`  Created institution admin: ${adminUser.email}`);

  // Teacher at Demo School
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@demo-school.dev' },
    update: {},
    create: {
      email: 'teacher@demo-school.dev',
      passwordHash: demoPasswordHash,
      firstName: 'María', lastName: 'García', status: 'ACTIVE',
    },
  });

  const teacherMembership = await prisma.userInstitution.upsert({
    where: { userId_institutionId: { userId: teacherUser.id, institutionId: demoInstitution.id } },
    update: {},
    create: { userId: teacherUser.id, institutionId: demoInstitution.id, status: 'ACTIVE' },
  });

  await prisma.userRole.upsert({
    where: { userInstitutionId_roleId: { userInstitutionId: teacherMembership.id, roleId: demoTeacher.id } },
    update: {},
    create: { userInstitutionId: teacherMembership.id, roleId: demoTeacher.id, institutionId: demoInstitution.id },
  });
  console.log(`  Created teacher: ${teacherUser.email}`);

  await prisma.userRole.upsert({
    where: { userInstitutionId_roleId: { userInstitutionId: teacherMembership.id, roleId: demoDirectorGrupo.id } },
    update: {},
    create: { userInstitutionId: teacherMembership.id, roleId: demoDirectorGrupo.id, institutionId: demoInstitution.id },
  });
  console.log(`  Assigned DIRECTOR_DE_GRUPO role: ${teacherUser.email}`);

  // Staff-directive roles at Demo School (Rector, Coordinators, Counselor, Psychologist)
  const staffUsers: Array<{
    email: string;
    firstName: string;
    lastName: string;
    tenantRole: { id: string };
  }> = [
    { email: 'rector@demo-school.dev', firstName: 'Ana', lastName: 'Martínez', tenantRole: demoRector },
    { email: 'coordinador-academico@demo-school.dev', firstName: 'Jorge', lastName: 'Ramírez', tenantRole: demoCoordAcad },
    { email: 'coordinador-convivencia@demo-school.dev', firstName: 'Lucía', lastName: 'Herrera', tenantRole: demoCoordConv },
    { email: 'orientador@demo-school.dev', firstName: 'Pedro', lastName: 'Vargas', tenantRole: demoOrientador },
    { email: 'psicologo@demo-school.dev', firstName: 'Sofía', lastName: 'Castro', tenantRole: demoPsicologo },
  ];

  for (const su of staffUsers) {
    const user = await prisma.user.upsert({
      where: { email: su.email },
      update: {},
      create: {
        email: su.email,
        passwordHash: demoPasswordHash,
        firstName: su.firstName,
        lastName: su.lastName,
        status: 'ACTIVE',
      },
    });

    const membership = await prisma.userInstitution.upsert({
      where: { userId_institutionId: { userId: user.id, institutionId: demoInstitution.id } },
      update: {},
      create: { userId: user.id, institutionId: demoInstitution.id, status: 'ACTIVE' },
    });

    await prisma.userRole.upsert({
      where: { userInstitutionId_roleId: { userInstitutionId: membership.id, roleId: su.tenantRole.id } },
      update: {},
      create: { userInstitutionId: membership.id, roleId: su.tenantRole.id, institutionId: demoInstitution.id },
    });
    console.log(`  Created staff user: ${user.email}`);
  }

  // Parent at Demo School
  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@demo-school.dev' },
    update: {},
    create: {
      email: 'parent@demo-school.dev',
      passwordHash: demoPasswordHash,
      firstName: 'Carlos', lastName: 'López', status: 'ACTIVE',
    },
  });

  const parentMembership = await prisma.userInstitution.upsert({
    where: { userId_institutionId: { userId: parentUser.id, institutionId: demoInstitution.id } },
    update: {},
    create: { userId: parentUser.id, institutionId: demoInstitution.id, status: 'ACTIVE' },
  });

  await prisma.userRole.upsert({
    where: { userInstitutionId_roleId: { userInstitutionId: parentMembership.id, roleId: demoParent.id } },
    update: {},
    create: { userInstitutionId: parentMembership.id, roleId: demoParent.id, institutionId: demoInstitution.id },
  });
  console.log(`  Created parent: ${parentUser.email}`);

  // Student at Demo School
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@demo-school.dev' },
    update: {},
    create: {
      email: 'student@demo-school.dev',
      passwordHash: demoPasswordHash,
      firstName: 'Ana', lastName: 'Martínez', status: 'ACTIVE',
    },
  });

  const studentMembership = await prisma.userInstitution.upsert({
    where: { userId_institutionId: { userId: studentUser.id, institutionId: demoInstitution.id } },
    update: {},
    create: { userId: studentUser.id, institutionId: demoInstitution.id, status: 'ACTIVE' },
  });

  await prisma.userRole.upsert({
    where: { userInstitutionId_roleId: { userInstitutionId: studentMembership.id, roleId: demoStudent.id } },
    update: {},
    create: { userInstitutionId: studentMembership.id, roleId: demoStudent.id, institutionId: demoInstitution.id },
  });
  console.log(`  Created student: ${studentUser.email}`);

  // 8. DEMO STUDENTS (Academic records)
  const demoStudents = [
    {
      firstName: 'Lucía',
      lastName: 'Fernández',
      documentType: 'DNI' as const,
      documentNumber: '30123456',
      dateOfBirth: new Date('2010-03-15'),
    },
    {
      firstName: 'Mateo',
      lastName: 'Rodríguez',
      documentType: 'DNI' as const,
      documentNumber: '30234567',
      dateOfBirth: new Date('2009-08-22'),
    },
    {
      firstName: 'Valentina',
      lastName: 'López',
      documentType: 'DNI' as const,
      documentNumber: '30345678',
      dateOfBirth: new Date('2011-01-10'),
    },
  ];

  for (const s of demoStudents) {
    await prisma.student.upsert({
      where: {
        institutionId_documentType_documentNumber: {
          institutionId: demoInstitution.id,
          documentType: s.documentType,
          documentNumber: s.documentNumber,
        },
      },
      update: {},
      create: {
        institutionId: demoInstitution.id,
        firstName: s.firstName,
        lastName: s.lastName,
        documentType: s.documentType,
        documentNumber: s.documentNumber,
        dateOfBirth: s.dateOfBirth,
        status: 'ACTIVE',
        // Link first student to the student user account
        ...(s === demoStudents[0] ? { userId: studentUser.id } : {}),
      },
    });
  }
  console.log(`  Created ${demoStudents.length} demo students for ${demoInstitution.name}`);

  // 9. DEMO COURSES
  const demoCourses = [
    { code: 'MAT-001', name: 'Matemáticas', description: 'Curso de matemáticas' },
    { code: 'CIE-001', name: 'Ciencias', description: 'Curso de ciencias naturales' },
    { code: 'LEN-001', name: 'Lengua Castellana', description: 'Curso de lengua y literatura' },
  ];

  for (const c of demoCourses) {
    await prisma.course.upsert({
      where: {
        institutionId_code: {
          institutionId: demoInstitution.id,
          code: c.code,
        },
      },
      update: {},
      create: {
        institutionId: demoInstitution.id,
        code: c.code,
        name: c.name,
        description: c.description,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`  Created ${demoCourses.length} demo courses for ${demoInstitution.name}`);

  // 9b. DEMO AREAS (curriculum hierarchy)
  const demoAreas = [
    { code: 'ARE-MAT', name: 'Matemáticas' },
    { code: 'ARE-CIE', name: 'Ciencias Naturales' },
    { code: 'ARE-LEN', name: 'Lenguaje' },
  ];

  const demoAreaRecords: Record<string, any> = {};
  for (const a of demoAreas) {
    const existing = await prisma.area.findFirst({
      where: { institutionId: demoInstitution.id, code: a.code },
    });
    if (existing) {
      demoAreaRecords[a.code] = existing;
    } else {
      demoAreaRecords[a.code] = await prisma.area.create({
        data: { institutionId: demoInstitution.id, code: a.code, name: a.name, isOfficial: true },
      });
    }
  }
  console.log(`  Created ${demoAreas.length} demo areas for ${demoInstitution.name}`);

  // 10. DEMO SUBJECTS
  const demoSubjects = [
    { code: 'MAT-S', name: 'Matemáticas', description: 'Asignatura de matemáticas', areaCode: 'ARE-MAT', subjectType: 'OBLIGATORIA' },
    { code: 'CIE-S', name: 'Ciencias Naturales', description: 'Asignatura de ciencias naturales', areaCode: 'ARE-CIE', subjectType: 'OBLIGATORIA' },
    { code: 'LEN-S', name: 'Lengua y Literatura', description: 'Asignatura de lengua y literatura', areaCode: 'ARE-LEN', subjectType: 'OBLIGATORIA' },
  ];

  for (const s of demoSubjects) {
    await prisma.subject.upsert({
      where: {
        institutionId_code: {
          institutionId: demoInstitution.id,
          code: s.code,
        },
      },
      update: {},
      create: {
        institutionId: demoInstitution.id,
        code: s.code,
        name: s.name,
        description: s.description,
        areaId: demoAreaRecords[s.areaCode] ? demoAreaRecords[s.areaCode].id : undefined,
        subjectType: s.subjectType as any,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`  Created ${demoSubjects.length} demo subjects for ${demoInstitution.name}`);

  // 10b. DEMO CLASSROOMS
  const demoClassrooms = [
    { code: 'AULA-101', name: 'Aula 101', type: 'AULA' },
    { code: 'AULA-102', name: 'Aula 102', type: 'AULA' },
    { code: 'AULA-201', name: 'Aula 201', type: 'AULA' },
    { code: 'AULA-202', name: 'Aula 202', type: 'AULA' },
    { code: 'LAB-1', name: 'Laboratorio 1', type: 'LAB_FISICA' },
    { code: 'LAB-2', name: 'Laboratorio 2', type: 'LAB_QUIMICA' },
    { code: 'COMP-1', name: 'Sala de cómputo 1', type: 'COMPUTO' },
    { code: 'CANCH-1', name: 'Cancha deportiva', type: 'CANCHA' },
    { code: 'AUD-1', name: 'Auditorio', type: 'AUDITORIO' },
  ];

  const demoClassroomRecords: Record<string, any> = {};
  for (const cl of demoClassrooms) {
    const existing = await prisma.classroom.findFirst({
      where: { institutionId: demoInstitution.id, code: cl.code },
    });
    if (existing) {
      demoClassroomRecords[cl.code] = existing;
    } else {
      demoClassroomRecords[cl.code] = await prisma.classroom.create({
        data: { institutionId: demoInstitution.id, code: cl.code, name: cl.name, type: cl.type as any },
      });
    }
  }
  console.log(`  Created ${demoClassrooms.length} demo classrooms for ${demoInstitution.name}`);

  // 10c. DEMO SCHEDULE BLOCKS
  const demoBlocks = [
    { name: 'Bloque 1', day: 'MONDAY', start: '07:00', end: '12:30' },
    { name: 'Bloque 2', day: 'TUESDAY', start: '07:00', end: '12:30' },
    { name: 'Bloque 3', day: 'WEDNESDAY', start: '07:00', end: '12:30' },
    { name: 'Bloque 4', day: 'THURSDAY', start: '07:00', end: '12:30' },
    { name: 'Bloque 5', day: 'FRIDAY', start: '07:00', end: '12:30' },
  ];

  for (const b of demoBlocks) {
    await prisma.scheduleBlock.upsert({
      where: {
        institutionId_name_dayOfWeek: {
          institutionId: demoInstitution.id,
          name: b.name,
          dayOfWeek: b.day as any,
        },
      },
      update: {},
      create: {
        institutionId: demoInstitution.id,
        name: b.name,
        dayOfWeek: b.day as any,
        startTime: new Date(`1970-01-01T${b.start}:00`),
        endTime: new Date(`1970-01-01T${b.end}:00`),
      },
    });
  }
  console.log(`  Created ${demoBlocks.length} demo schedule blocks for ${demoInstitution.name}`);

  // 11. DEMO GRADES
  const gradeStudents = await prisma.student.findMany({
    where: { institutionId: demoInstitution.id },
  });
  const gradeCourses = await prisma.course.findMany({
    where: { institutionId: demoInstitution.id },
  });
  const gradeSubjectRecords = await prisma.subject.findMany({
    where: { institutionId: demoInstitution.id },
  });

  if (gradeStudents.length > 0 && gradeCourses.length > 0 && gradeSubjectRecords.length > 0) {
    const periods = ['2026-P1', '2026-P2'];
    const evalTypes = ['Parcial', 'Final'];
    let gradeCount = 0;

    for (const student of gradeStudents.slice(0, 2)) {
      for (const course of gradeCourses.slice(0, 2)) {
        for (const subject of gradeSubjectRecords.slice(0, 2)) {
          for (let i = 0; i < periods.length; i++) {
            const existing = await prisma.grade.findFirst({
              where: {
                institutionId: demoInstitution.id,
                studentId: student.id,
                courseId: course.id,
                subjectId: subject.id,
                period: periods[i],
              },
            });
            if (!existing) {
              const value = (Math.random() * 5).toFixed(2);
              await prisma.grade.create({
                data: {
                  institutionId: demoInstitution.id,
                  studentId: student.id,
                  courseId: course.id,
                  subjectId: subject.id,
                  value,
                  period: periods[i],
                  evaluationType: evalTypes[i],
                  status: 'ACTIVE',
                },
              });
              gradeCount++;
            }
          }
        }
      }
    }
    console.log(`  Created ${gradeCount} demo grade records for ${demoInstitution.name}`);
  }

  // 12. DEMO SCHEDULES
  const scheduleCourses = await prisma.course.findMany({
    where: { institutionId: demoInstitution.id },
  });
  const scheduleSubjects = await prisma.subject.findMany({
    where: { institutionId: demoInstitution.id },
  });

  if (scheduleCourses.length > 0 && scheduleSubjects.length > 0) {
    const scheduleData = [
      { courseIdx: 0, subjectIdx: 0, day: 'MONDAY', start: '08:00', end: '09:30', classroomCode: 'AULA-101', blockName: 'Bloque 1' },
      { courseIdx: 0, subjectIdx: 0, day: 'WEDNESDAY', start: '08:00', end: '09:30', classroomCode: 'AULA-101', blockName: 'Bloque 3' },
      { courseIdx: 0, subjectIdx: 1, day: 'TUESDAY', start: '10:00', end: '11:30', classroomCode: 'AULA-102', blockName: 'Bloque 2' },
      { courseIdx: 1, subjectIdx: 1, day: 'THURSDAY', start: '08:00', end: '09:30', classroomCode: 'LAB-1', blockName: 'Bloque 4' },
      { courseIdx: 1, subjectIdx: 2, day: 'FRIDAY', start: '10:00', end: '11:30', classroomCode: 'AULA-201', blockName: 'Bloque 5' },
      { courseIdx: 2, subjectIdx: 2, day: 'MONDAY', start: '10:00', end: '11:30', classroomCode: 'AULA-202', blockName: 'Bloque 1' },
    ];

    let scheduleCount = 0;
    for (const s of scheduleData) {
      const course = scheduleCourses[s.courseIdx];
      const subject = scheduleSubjects[s.subjectIdx];
      if (!course || !subject) continue;

      const classroom = demoClassroomRecords[s.classroomCode];
      const block = await prisma.scheduleBlock.findFirst({
        where: { institutionId: demoInstitution.id, name: s.blockName },
      });

      const existing = await prisma.schedule.findFirst({
        where: {
          institutionId: demoInstitution.id,
          courseId: course.id,
          subjectId: subject.id,
          dayOfWeek: s.day as any,
        },
      });
      if (!existing) {
        await prisma.schedule.create({
          data: {
            institutionId: demoInstitution.id,
            courseId: course.id,
            subjectId: subject.id,
            classroomId: classroom ? classroom.id : undefined,
            blockId: block ? block.id : undefined,
            dayOfWeek: s.day as any,
            startTime: new Date(`1970-01-01T${s.start}:00`),
            endTime: new Date(`1970-01-01T${s.end}:00`),
            status: 'ACTIVE',
          },
        });
        scheduleCount++;
      }
    }
    console.log(`  Created ${scheduleCount} demo schedule records for ${demoInstitution.name}`);
  }

  // 13. DEMO TASKS
  const taskCourses = await prisma.course.findMany({
    where: { institutionId: demoInstitution.id },
  });
  const taskSubjects = await prisma.subject.findMany({
    where: { institutionId: demoInstitution.id },
  });

  if (taskCourses.length > 0 && taskSubjects.length > 0) {
    const taskData = [
      { courseIdx: 0, subjectIdx: 0, title: 'Taller de fracciones', description: 'Resolver los ejercicios 1 al 20 del libro de texto.', dueDays: 7 },
      { courseIdx: 0, subjectIdx: 0, title: 'Ejercicios de geometría', description: 'Practicar construcciones con regla y compás.', dueDays: 14 },
      { courseIdx: 1, subjectIdx: 1, title: 'Comprensión lectora', description: 'Leer el capítulo 3 y responder las preguntas de comprensión.', dueDays: 5 },
      { courseIdx: 2, subjectIdx: 2, title: 'Ensayo corto', description: 'Redactar un ensayo de 300 palabras sobre un tema libre.', dueDays: 10 },
    ];

    let taskCount = 0;
    for (const t of taskData) {
      const course = taskCourses[t.courseIdx];
      const subject = taskSubjects[t.subjectIdx];
      if (!course || !subject) continue;

      const existing = await prisma.task.findFirst({
        where: {
          institutionId: demoInstitution.id,
          courseId: course.id,
          subjectId: subject.id,
          title: t.title,
        },
      });
      if (!existing) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + t.dueDays);
        dueDate.setHours(23, 59, 0, 0);

        await prisma.task.create({
          data: {
            institutionId: demoInstitution.id,
            courseId: course.id,
            subjectId: subject.id,
            title: t.title,
            description: t.description,
            dueDate,
            status: 'PUBLISHED',
          },
        });
        taskCount++;
      }
    }
    console.log(`  Created ${taskCount} demo task records for ${demoInstitution.name}`);
  }

  // 14. DEMO COMMUNICATIONS
  const commData = [
    {
      title: 'Reunión de padres — Septiembre',
      content: 'Se convoca a todos los padres de familia a la reunión del mes de septiembre el próximo viernes a las 6:00 PM en el auditorio principal.',
      audience: 'PARENTS' as const,
      status: 'PUBLISHED' as const,
    },
    {
      title: 'Capacitación docente — Nuevos estándares curriculares',
      content: 'Se invita a todos los docentes a la jornada de capacitación sobre los nuevos estándares curriculares. Fecha: 15 de septiembre. Lugar: Sala de conferencias.',
      audience: 'TEACHERS' as const,
      status: 'PUBLISHED' as const,
    },
    {
      title: 'Calificaciones del primer período disponibles',
      content: 'Las calificaciones del primer período ya están disponibles en la plataforma. Estudiantes y padres pueden consultarlas.',
      audience: 'ALL' as const,
      status: 'PUBLISHED' as const,
    },
    {
      title: 'Suspensión de clases por mantenimiento',
      content: 'Debido a trabajos de mantenimiento general, las clases del próximo lunes quedan suspendidas. Se retomarán el martes con normalidad.',
      audience: 'ALL' as const,
      status: 'DRAFT' as const,
    },
  ];

  let commCount = 0;
  for (const c of commData) {
    const existing = await prisma.communication.findFirst({
      where: {
        institutionId: demoInstitution.id,
        title: c.title,
      },
    });
    if (!existing) {
      await prisma.communication.create({
        data: {
          institutionId: demoInstitution.id,
          title: c.title,
          content: c.content,
          audience: c.audience,
          status: c.status,
          publishedAt: c.status === 'PUBLISHED' ? new Date() : null,
        },
      });
      commCount++;
    }
  }
  console.log(`  Created ${commCount} demo communication records for ${demoInstitution.name}`);

  // 15. DEMO SIGNATURE REQUESTS
  if (teacherUser && parentUser && adminUser) {
    const sigData = [
      {
        title: 'Autorización de excursión escolar',
        description: 'Firma de autorización para la excursión al museo del próximo viernes.',
        status: 'PUBLISHED' as const,
        recipientIds: [parentUser.id, teacherUser.id],
        createdById: adminUser.id,
        dueDays: 14,
      },
      {
        title: 'Acuerdo de confidencialidad docente',
        description: 'Acuerdo de confidencialidad que todos los docentes deben firmar al inicio del ciclo.',
        status: 'DRAFT' as const,
        recipientIds: [teacherUser.id, adminUser.id],
        createdById: adminUser.id,
        dueDays: 30,
      },
    ];

    let sigCount = 0;
    for (const s of sigData) {
      const existing = await prisma.signatureRequest.findFirst({
        where: { institutionId: demoInstitution.id, title: s.title },
      });
      if (!existing) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + s.dueDays);
        dueDate.setHours(23, 59, 0, 0);

        const req = await prisma.signatureRequest.create({
          data: {
            institutionId: demoInstitution.id,
            createdById: s.createdById,
            title: s.title,
            description: s.description,
            status: s.status,
            dueDate,
            recipients: {
              create: s.recipientIds.map((uid) => ({
                userId: uid,
                status: 'PENDING' as const,
              })),
            },
          },
        });
        sigCount++;
      }
    }
    console.log(`  Created ${sigCount} demo signature requests for ${demoInstitution.name}`);
  }

  // 16. DEMO NOTIFICATIONS
  if (teacherUser && parentUser && adminUser) {
    const notifData = [
      {
        userId: parentUser.id,
        type: 'SIGNATURE_REQUEST' as const,
        title: 'Nueva solicitud de firma',
        message: 'Tienes una nueva solicitud de firma: Autorización de excursión escolar.',
        entityType: 'SignatureRequest',
      },
      {
        userId: teacherUser.id,
        type: 'COMMUNICATION' as const,
        title: 'Nueva comunicación publicada',
        message: 'Se publicó una nueva comunicación: Reunión de padres — Septiembre.',
        entityType: 'Communication',
      },
      {
        userId: adminUser.id,
        type: 'TASK_UPDATE' as const,
        title: 'Actividad actualizada',
        message: 'Una actividad ha sido actualizada recientemente.',
        entityType: 'Task',
      },
    ];

    let notifCount = 0;
    for (const n of notifData) {
      const existing = await prisma.notification.findFirst({
        where: {
          institutionId: demoInstitution.id,
          userId: n.userId,
          title: n.title,
        },
      });
      if (!existing) {
        await prisma.notification.create({
          data: {
            institutionId: demoInstitution.id,
            userId: n.userId,
            type: n.type,
            title: n.title,
            message: n.message,
            entityType: n.entityType,
          },
        });
        notifCount++;
      }
    }
    console.log(`  Created ${notifCount} demo notifications for ${demoInstitution.name}`);
  }

  // 17. DEMO SCHOOL GRADES
  const schoolGradesData = [
    { name: 'Preescolar', code: 'PRE', sortOrder: 0 },
    { name: 'Primero', code: '1RO', sortOrder: 1 },
    { name: 'Segundo', code: '2DO', sortOrder: 2 },
    { name: 'Tercero', code: '3RO', sortOrder: 3 },
    { name: 'Cuarto', code: '4TO', sortOrder: 4 },
    { name: 'Quinto', code: '5TO', sortOrder: 5 },
  ];

  const schoolGradeRecords: Record<string, any> = {};
  for (const sg of schoolGradesData) {
    const existing = await prisma.schoolGrade.findUnique({
      where: { institutionId_code: { institutionId: demoInstitution.id, code: sg.code } },
    });
    if (!existing) {
      schoolGradeRecords[sg.code] = await prisma.schoolGrade.create({
        data: { institutionId: demoInstitution.id, name: sg.name, code: sg.code, sortOrder: sg.sortOrder },
      });
    } else {
      schoolGradeRecords[sg.code] = existing;
    }
  }
  console.log(`  Created ${schoolGradesData.length} demo school grades for ${demoInstitution.name}`);

  // 18. DEMO ACADEMIC PERIODS
  const academicPeriodsData = [
    { name: '2026 - Periodo 1', code: '2026-P1', startDate: '2026-01-15', endDate: '2026-06-30', status: 'ACTIVE' as const },
    { name: '2026 - Periodo 2', code: '2026-P2', startDate: '2026-07-15', endDate: '2026-12-15', status: 'ACTIVE' as const },
    { name: '2026 - Periodo 3', code: '2026-P3', startDate: '2027-01-15', endDate: '2027-06-30', status: 'CLOSED' as const },
  ];

  const academicPeriodRecords: Record<string, any> = {};
  for (const ap of academicPeriodsData) {
    const existing = await prisma.academicPeriod.findUnique({
      where: { institutionId_code: { institutionId: demoInstitution.id, code: ap.code } },
    });
    if (!existing) {
      academicPeriodRecords[ap.code] = await prisma.academicPeriod.create({
        data: {
          institutionId: demoInstitution.id,
          createdById: adminUser.id,
          name: ap.name,
          code: ap.code,
          startDate: new Date(ap.startDate),
          endDate: new Date(ap.endDate),
          status: ap.status,
          ...(ap.status === 'CLOSED'
            ? { closedById: adminUser.id, closedAt: new Date() }
            : {}),
        },
      });
    } else {
      academicPeriodRecords[ap.code] = existing;
    }
  }
  console.log(`  Created ${academicPeriodsData.length} demo academic periods for ${demoInstitution.name}`);

  // Link demo grades to their academic period by code (keeps in sync after reruns).
  await prisma.$executeRaw`
    UPDATE "grades" g
    SET "academic_period_id" = ap."id"
    FROM "academic_periods" ap
    WHERE ap."institution_id" = g."institution_id"
      AND lower(ap."code") = lower(g."period")
      AND g."institution_id" = ${demoInstitution.id}::uuid
  `;

  // 19. DEMO GUARDIAN-STUDENT LINKS
  const guardianStudents = await prisma.student.findMany({
    where: { institutionId: demoInstitution.id },
  });

  if (guardianStudents.length > 0 && parentUser) {
    let gsCount = 0;
    for (const student of guardianStudents.slice(0, 2)) {
      const existing = await prisma.guardianStudent.findUnique({
        where: { institutionId_guardianUserId_studentId: { institutionId: demoInstitution.id, guardianUserId: parentUser.id, studentId: student.id } },
      });
      if (!existing) {
        await prisma.guardianStudent.create({
          data: {
            institutionId: demoInstitution.id,
            guardianUserId: parentUser.id,
            studentId: student.id,
            relationshipType: gsCount === 0 ? 'FATHER' : 'MOTHER',
            isPrimary: gsCount === 0,
          },
        });
        gsCount++;
      }
    }
    console.log(`  Created ${gsCount} demo guardian-student links for ${demoInstitution.name}`);
  }

  // 20. DEMO ENROLLMENTS
  const enrollStudents = await prisma.student.findMany({ where: { institutionId: demoInstitution.id } });
  const enrollCourses = await prisma.course.findMany({ where: { institutionId: demoInstitution.id } });

  if (enrollStudents.length > 0 && enrollCourses.length > 0 && schoolGradeRecords['1RO'] && academicPeriodRecords['2026-P1']) {
    // Enroll the first students in every course the demo teacher is assigned to
    // (enrollCourses.slice(0, 2) matches the teacher-assignment loop below). Keeping
    // enrollments in sync with teacher assignments guarantees each course the teacher
    // teaches has enrolled students, so report fixtures (course report) are coherent.
    const coursesToEnroll = enrollCourses.slice(0, 2);
    let enrollCount = 0;
    for (const course of coursesToEnroll) {
      for (const student of enrollStudents.slice(0, 2)) {
        const existing = await prisma.enrollment.findUnique({
          where: {
            institutionId_studentId_courseId_academicPeriodId: {
              institutionId: demoInstitution.id,
              studentId: student.id,
              courseId: course.id,
              academicPeriodId: academicPeriodRecords['2026-P1'].id,
            },
          },
        });
        if (!existing) {
          await prisma.enrollment.create({
            data: {
              institutionId: demoInstitution.id,
              studentId: student.id,
              courseId: course.id,
              schoolGradeId: schoolGradeRecords['1RO'].id,
              academicPeriodId: academicPeriodRecords['2026-P1'].id,
            },
          });
          enrollCount++;
        }
      }
    }
    console.log(`  Created ${enrollCount} demo enrollments for ${demoInstitution.name}`);
  }

  // 21. DEMO TEACHER ASSIGNMENTS
  const assignSubjects = await prisma.subject.findMany({ where: { institutionId: demoInstitution.id } });

  if (teacherUser && enrollCourses.length > 0 && assignSubjects.length > 0 && academicPeriodRecords['2026-P1']) {
    let taCount = 0;
    for (const course of enrollCourses.slice(0, 2)) {
      for (const subject of assignSubjects.slice(0, 1)) {
        const existing = await prisma.teacherAssignment.findUnique({
          where: {
            institutionId_teacherUserId_courseId_subjectId_academicPeriodId: {
              institutionId: demoInstitution.id,
              teacherUserId: teacherUser.id,
              courseId: course.id,
              subjectId: subject.id,
              academicPeriodId: academicPeriodRecords['2026-P1'].id,
            },
          },
        });
        if (!existing) {
          await prisma.teacherAssignment.create({
            data: {
              institutionId: demoInstitution.id,
              teacherUserId: teacherUser.id,
              courseId: course.id,
              subjectId: subject.id,
              academicPeriodId: academicPeriodRecords['2026-P1'].id,
              startDate: new Date('2026-01-01'),
            },
          });
          taCount++;
        }
      }
    }
    console.log(`  Created ${taCount} demo teacher assignments for ${demoInstitution.name}`);
  }

  // 21b. DEMO ATTENDANCE
  if (
    adminUser &&
    enrollStudents.length > 0 &&
    enrollCourses.length > 0 &&
    academicPeriodRecords['2026-P1']
  ) {
    const attendDate = new Date('2026-03-10T00:00:00.000Z');
    const statuses = ['PRESENT', 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const;
    let attCount = 0;
    for (const student of enrollStudents.slice(0, 3)) {
      const existing = await prisma.attendance.findUnique({
        where: {
          institutionId_studentId_courseId_date: {
            institutionId: demoInstitution.id,
            studentId: student.id,
            courseId: enrollCourses[0].id,
            date: attendDate,
          },
        },
      });
      if (!existing) {
        await prisma.attendance.create({
          data: {
            institutionId: demoInstitution.id,
            studentId: student.id,
            courseId: enrollCourses[0].id,
            academicPeriodId: academicPeriodRecords['2026-P1'].id,
            date: attendDate,
            status: statuses[attCount % statuses.length],
            notes: null,
            recordedById: adminUser.id,
          },
        });
        attCount++;
      }
    }
    console.log(`  Created ${attCount} demo attendance records for ${demoInstitution.name}`);
  }

  // 22. DEMO TASK ASSIGNMENTS
  const taskAssignmentTasks = await prisma.task.findMany({ where: { institutionId: demoInstitution.id } });
  const taskAssignmentStudents = await prisma.student.findMany({ where: { institutionId: demoInstitution.id } });
  const taskAssignmentEnrollments = await prisma.enrollment.findMany({ where: { institutionId: demoInstitution.id } });

  if (taskAssignmentTasks.length > 0 && taskAssignmentStudents.length > 0) {
    let taCount = 0;
    for (const task of taskAssignmentTasks.slice(0, 2)) {
      for (const student of taskAssignmentStudents.slice(0, 2)) {
        const existing = await prisma.taskAssignment.findUnique({
          where: { taskId_studentId: { taskId: task.id, studentId: student.id } },
        });
        if (!existing) {
          const enrollment = taskAssignmentEnrollments.find(
            (e) => e.studentId === student.id && e.courseId === task.courseId,
          );
          await prisma.taskAssignment.create({
            data: {
              institutionId: demoInstitution.id,
              taskId: task.id,
              studentId: student.id,
              enrollmentId: enrollment?.id,
            },
          });
          taCount++;
        }
      }
    }
    console.log(`  Created ${taCount} demo task assignments for ${demoInstitution.name}`);
  }

  // 23. DEMO TASK SUBMISSIONS
  const taskSubmissions = await prisma.taskAssignment.findMany({
    where: { institutionId: demoInstitution.id },
    include: { task: true },
  });

  if (taskSubmissions.length > 0) {
    let tsCount = 0;
    for (const assignment of taskSubmissions.slice(0, 2)) {
      const existing = await prisma.taskSubmission.findUnique({
        where: { taskAssignmentId: assignment.id },
      });
      if (!existing) {
        const isOverdue = assignment.task.dueDate < new Date();
        await prisma.taskSubmission.create({
          data: {
            institutionId: demoInstitution.id,
            taskAssignmentId: assignment.id,
            studentId: assignment.studentId,
            status: isOverdue ? 'LATE' : 'SUBMITTED',
            content: 'Entrega de demostración',
            submittedAt: new Date(),
          },
        });
        tsCount++;
      }
    }
    console.log(`  Created ${tsCount} demo task submissions for ${demoInstitution.name}`);
  }

  // 24. DEMO COMMUNICATION RECIPIENTS
  const commRecipients = await prisma.communication.findMany({
    where: { institutionId: demoInstitution.id, status: 'PUBLISHED' },
  });
  const allUsers = [
    { id: adminUser.id, email: adminUser.email },
    { id: teacherUser.id, email: teacherUser.email },
    { id: parentUser.id, email: parentUser.email },
    { id: studentUser.id, email: studentUser.email },
  ];

  if (commRecipients.length > 0) {
    let crCount = 0;
    for (const comm of commRecipients.slice(0, 2)) {
      for (const user of allUsers.slice(0, 2)) {
        const existing = await prisma.communicationRecipient.findUnique({
          where: { communicationId_userId: { communicationId: comm.id, userId: user.id } },
        });
        if (!existing) {
          await prisma.communicationRecipient.create({
            data: {
              institutionId: demoInstitution.id,
              communicationId: comm.id,
              userId: user.id,
            },
          });
          crCount++;
        }
      }
    }
    console.log(`  Created ${crCount} demo communication recipients for ${demoInstitution.name}`);
  }

  // 24b. DEMO FILE ASSETS & ATTACHMENTS
  const fileAdminUser = await prisma.user.findUnique({ where: { email: 'admin@demo-school.dev' } });
  if (fileAdminUser) {
    const existingTask = await prisma.task.findFirst({ where: { institutionId: demoInstitution.id } });
    const existingComm = await prisma.communication.findFirst({ where: { institutionId: demoInstitution.id } });

    const demoFileData = {
      institutionId: demoInstitution.id,
      originalName: 'demo-document.pdf',
      storageKey: `tenant/${demoInstitution.id}/files/seed-demo-document.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      uploadedByUserId: fileAdminUser.id,
    };

    let demoFile = await prisma.fileAsset.findFirst({
      where: { institutionId: demoInstitution.id, originalName: 'demo-document.pdf' },
    });
    if (!demoFile) {
      demoFile = await prisma.fileAsset.create({ data: demoFileData });
    }

    if (existingTask) {
      const existingTaskAtt = await prisma.taskAttachment.findFirst({
        where: { taskId: existingTask.id, fileAssetId: demoFile.id },
      });
      if (!existingTaskAtt) {
        await prisma.taskAttachment.create({
          data: {
            institutionId: demoInstitution.id,
            taskId: existingTask.id,
            fileAssetId: demoFile.id,
          },
        });
      }
    }

    if (existingComm) {
      const existingCommAtt = await prisma.communicationAttachment.findFirst({
        where: { communicationId: existingComm.id, fileAssetId: demoFile.id },
      });
      if (!existingCommAtt) {
        await prisma.communicationAttachment.create({
          data: {
            institutionId: demoInstitution.id,
            communicationId: existingComm.id,
            fileAssetId: demoFile.id,
          },
        });
      }
    }

    console.log(`  Created demo file asset and attachments for ${demoInstitution.name}`);
  }

  // 25. SUMMARY
  const totalPermissions = await prisma.permission.count();
  const totalRoles = await prisma.role.count();
  const totalRolePermissions = await prisma.rolePermission.count();
  const totalUserRoles = await prisma.userRole.count();
  const totalGlobalUserRoles = await prisma.globalUserRole.count();
  const totalSigRequests = await prisma.signatureRequest.count();
  const totalSigRecipients = await prisma.signatureRecipient.count();
  const totalNotifications = await prisma.notification.count();
  const totalSchoolGrades = await prisma.schoolGrade.count();
  const totalAcademicPeriods = await prisma.academicPeriod.count();
  const totalGuardianStudents = await prisma.guardianStudent.count();
  const totalEnrollments = await prisma.enrollment.count();
  const totalTeacherAssignments = await prisma.teacherAssignment.count();
  const totalTaskAssignments = await prisma.taskAssignment.count();
  const totalTaskSubmissions = await prisma.taskSubmission.count();
  const totalCommunicationRecipients = await prisma.communicationRecipient.count();
  const totalFileAssets = await prisma.fileAsset.count();
  const totalTaskAttachments = await prisma.taskAttachment.count();
  const totalCommunicationAttachments = await prisma.communicationAttachment.count();

  console.log('\n=== SEED SUMMARY ===');
  console.log(`  Permissions: ${totalPermissions}`);
  console.log(`  Roles: ${totalRoles}`);
  console.log(`  RolePermissions: ${totalRolePermissions}`);
  console.log(`  UserRoles: ${totalUserRoles}`);
  console.log(`  GlobalUserRoles: ${totalGlobalUserRoles}`);
  console.log(`  Signature Requests: ${totalSigRequests}`);
  console.log(`  Signature Recipients: ${totalSigRecipients}`);
  console.log(`  Notifications: ${totalNotifications}`);
  console.log(`  School Grades: ${totalSchoolGrades}`);
  console.log(`  Academic Periods: ${totalAcademicPeriods}`);
  console.log(`  Guardian-Student Links: ${totalGuardianStudents}`);
  console.log(`  Enrollments: ${totalEnrollments}`);
  console.log(`  Teacher Assignments: ${totalTeacherAssignments}`);
  console.log(`  Task Assignments: ${totalTaskAssignments}`);
  console.log(`  Task Submissions: ${totalTaskSubmissions}`);
  console.log(`  Communication Recipients: ${totalCommunicationRecipients}`);
  console.log(`  File Assets: ${totalFileAssets}`);
  console.log(`  Task Attachments: ${totalTaskAttachments}`);
  console.log(`  Communication Attachments: ${totalCommunicationAttachments}`);
  console.log(`  Demo password: ${DEMO_PASSWORD} (FOR DEVELOPMENT ONLY)`);
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
