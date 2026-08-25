import { PrismaClient, RoleType } from '@prisma/client';

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function pass(label: string) {
  passed++;
  console.log(`  PASS - ${label}`);
}

function fail(label: string, reason: string) {
  failed++;
  console.log(`  FAIL - ${label} -- ${reason}`);
}

async function cleanup() {
  await prisma.userRole.deleteMany({
    where: { userInstitution: { user: { email: { contains: 'integ-test' } } } },
  });
  await prisma.globalUserRole.deleteMany({
    where: { user: { email: { contains: 'integ-test' } } },
  });
  await prisma.userInstitution.deleteMany({
    where: { user: { email: { contains: 'integ-test' } } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: 'integ-test' } },
  });
  await prisma.institution.deleteMany({
    where: { slug: { contains: 'integ-test' } },
  });
  await prisma.rolePermission.deleteMany({
    where: { role: { name: 'CUSTOM_TEST_ROLE' } },
  });
  await prisma.role.deleteMany({
    where: { name: 'CUSTOM_TEST_ROLE' },
  });
  await prisma.auditLog.deleteMany({
    where: { user: { email: { contains: 'integ-test' } } },
  });
}

async function main(): Promise<void> {
  console.log('\n=== INTEGRITY TESTS (12 tests) ===\n');

  // Clean up any leftover test data from previous runs
  await cleanup();
  console.log('  Cleaned up any leftover test data.\n');

  // SETUP: Get template roles (institutionId = null)
  const templateTeacher = await prisma.role.findFirst({
    where: { name: 'TEACHER', institutionId: null },
  });
  const templateParent = await prisma.role.findFirst({
    where: { name: 'PARENT', institutionId: null },
  });
  const superAdminRole = await prisma.role.findFirst({
    where: { name: 'SUPER_ADMIN', institutionId: null },
  });

  if (!templateTeacher || !templateParent || !superAdminRole) {
    console.error('Template roles not found. Run seed first.');
    process.exit(1);
  }

  // ================================================================
  // TEST 01: User without institution
  // ================================================================
  console.log('TEST 01: User without institution');
  const userNoInst = await prisma.user.create({
    data: {
      email: 'integ-test-no-inst@test.dev',
      passwordHash: 'placeholder',
      firstName: 'NoInst',
      lastName: 'User',
    },
  });
  const memberships = await prisma.userInstitution.findMany({
    where: { userId: userNoInst.id },
  });
  if (memberships.length === 0) {
    pass('User created without institution memberships');
  } else {
    fail('User without institution', 'Unexpected memberships found');
  }

  // ================================================================
  // TEST 02: User belongs to Institution A
  // ================================================================
  console.log('\nTEST 02: User belongs to Institution A');
  const instA = await prisma.institution.create({
    data: { name: 'Integ Test Inst A', slug: 'integ-test-inst-a' },
  });
  const membershipA = await prisma.userInstitution.create({
    data: { userId: userNoInst.id, institutionId: instA.id, status: 'ACTIVE' },
  });
  const checkA = await prisma.userInstitution.findUnique({
    where: { id: membershipA.id },
    include: { institution: true },
  });
  if (checkA && checkA.institutionId === instA.id) {
    pass('User belongs to Institution A');
  } else {
    fail('User belongs to Institution A', 'Membership not correctly created');
  }

  // ================================================================
  // TEST 03: Same user belongs to Institution B
  // ================================================================
  console.log('\nTEST 03: Same user belongs to Institution B');
  const instB = await prisma.institution.create({
    data: { name: 'Integ Test Inst B', slug: 'integ-test-inst-b' },
  });
  const membershipB = await prisma.userInstitution.create({
    data: { userId: userNoInst.id, institutionId: instB.id, status: 'ACTIVE' },
  });
  const membershipsCheck = await prisma.userInstitution.findMany({
    where: { userId: userNoInst.id },
  });
  if (membershipsCheck.length === 2) {
    pass('User belongs to both Institution A and Institution B');
  } else {
    fail('Multi-tenant membership', `Expected 2 memberships, got ${membershipsCheck.length}`);
  }

  // SETUP: Create tenant roles for Institution A and B
  // These are the copies of templates with institutionId set
  const instATeacher = await prisma.role.create({
    data: {
      name: 'TEACHER', description: 'Teacher at Inst A', isSystem: true,
      roleType: RoleType.TENANT, institutionId: instA.id,
    },
  });
  const instAParent = await prisma.role.create({
    data: {
      name: 'PARENT', description: 'Parent at Inst A', isSystem: true,
      roleType: RoleType.TENANT, institutionId: instA.id,
    },
  });
  const instBTeacher = await prisma.role.create({
    data: {
      name: 'TEACHER', description: 'Teacher at Inst B', isSystem: true,
      roleType: RoleType.TENANT, institutionId: instB.id,
    },
  });
  const instBParent = await prisma.role.create({
    data: {
      name: 'PARENT', description: 'Parent at Inst B', isSystem: true,
      roleType: RoleType.TENANT, institutionId: instB.id,
    },
  });

  // ================================================================
  // TEST 04: User with TEACHER in Institution A
  // ================================================================
  console.log('\nTEST 04: User with TEACHER in Institution A');
  const userRoleA = await prisma.userRole.create({
    data: {
      userInstitutionId: membershipA.id,
      roleId: instATeacher.id,
      institutionId: instA.id,
    },
  });
  const checkRoleA = await prisma.userRole.findUnique({
    where: { id: userRoleA.id },
    include: { role: true, institution: true, userInstitution: true },
  });
  if (
    checkRoleA &&
    checkRoleA.role.name === 'TEACHER' &&
    checkRoleA.institutionId === instA.id &&
    checkRoleA.userInstitution.institutionId === instA.id
  ) {
    pass('TEACHER role assigned to user in Institution A');
  } else {
    fail('TEACHER in Institution A', 'Role assignment incorrect');
  }

  // ================================================================
  // TEST 05: Same user with PARENT in Institution B
  // ================================================================
  console.log('\nTEST 05: Same user with PARENT in Institution B');
  const userRoleB = await prisma.userRole.create({
    data: {
      userInstitutionId: membershipB.id,
      roleId: instBParent.id,
      institutionId: instB.id,
    },
  });
  const checkRoleB = await prisma.userRole.findUnique({
    where: { id: userRoleB.id },
    include: { role: true, institution: true },
  });
  if (
    checkRoleB &&
    checkRoleB.role.name === 'PARENT' &&
    checkRoleB.institutionId === instB.id
  ) {
    pass('PARENT role assigned to user in Institution B');
  } else {
    fail('PARENT in Institution B', 'Role assignment incorrect');
  }

  // ================================================================
  // TEST 06: Assign role of Institution B to membership of Institution A - MUST FAIL
  // ================================================================
  console.log('\nTEST 06: Cross-tenant role assignment MUST FAIL');
  try {
    await prisma.userRole.create({
      data: {
        userInstitutionId: membershipA.id,
        roleId: instBParent.id,
        institutionId: instB.id,
      },
    });
    fail('Cross-tenant assignment', 'Should have failed but succeeded');
  } catch (e: any) {
    if (e.code === 'P2003' || e.message?.includes('Foreign key constraint')) {
      pass('Cross-tenant role assignment correctly rejected by DB constraint');
    } else {
      fail('Cross-tenant assignment', `Unexpected error code: ${e.code} - ${e.message}`);
    }
  }

  // Also test: role's institutionId mismatches membership's institutionId
  console.log('TEST 06b: Role institution mismatch MUST FAIL');
  try {
    await prisma.userRole.create({
      data: {
        userInstitutionId: membershipA.id,
        roleId: instBParent.id,
        institutionId: instA.id,
      },
    });
    fail('Role institution mismatch', 'Should have failed but succeeded');
  } catch (e: any) {
    if (e.code === 'P2003' || e.message?.includes('Foreign key constraint')) {
      pass('Role institution mismatch correctly rejected by DB constraint');
    } else {
      fail('Role institution mismatch', `Unexpected error: ${e.code} - ${e.message}`);
    }
  }

  // ================================================================
  // TEST 07: GlobalUserRole with tenant role MUST FAIL
  // ================================================================
  console.log('\nTEST 07: GlobalUserRole with tenant role MUST FAIL');
  try {
    await prisma.globalUserRole.create({
      data: {
        userId: userNoInst.id,
        roleId: instATeacher.id,
      },
    });
    fail('GlobalUserRole with tenant role', 'Should have failed but succeeded');
  } catch (e: any) {
    if (e.code === 'P2003' || e.message?.includes('GlobalUserRole cannot reference')) {
      pass('GlobalUserRole with tenant role correctly rejected by trigger');
    } else {
      fail('GlobalUserRole with tenant role', `Unexpected error: ${e.code} - ${e.message}`);
    }
  }

  // ================================================================
  // TEST 08: Assign SUPER_ADMIN global - Must work
  // ================================================================
  console.log('\nTEST 08: Assign SUPER_ADMIN global');
  const globalRole = await prisma.globalUserRole.create({
    data: {
      userId: userNoInst.id,
      roleId: superAdminRole.id,
    },
  });
  const checkGlobal = await prisma.globalUserRole.findUnique({
    where: { id: globalRole.id },
    include: { role: true },
  });
  if (checkGlobal && checkGlobal.role.name === 'SUPER_ADMIN') {
    pass('SUPER_ADMIN global role assigned successfully');
  } else {
    fail('SUPER_ADMIN assignment', 'Role assignment incorrect');
  }

  // ================================================================
  // TEST 09: Duplicate membership MUST FAIL
  // ================================================================
  console.log('\nTEST 09: Duplicate membership MUST FAIL');
  try {
    await prisma.userInstitution.create({
      data: { userId: userNoInst.id, institutionId: instA.id, status: 'ACTIVE' },
    });
    fail('Duplicate membership', 'Should have thrown unique constraint violation');
  } catch (e: any) {
    if (e.code === 'P2002' || e.message?.includes('unique')) {
      pass('Duplicate membership correctly rejected');
    } else {
      fail('Duplicate membership', `Unexpected error: ${e.code} - ${e.message}`);
    }
  }

  // ================================================================
  // TEST 10: Permissions correctly assigned to roles
  // ================================================================
  console.log('\nTEST 10: Permissions correctly assigned to roles');

  const superAdminPerms = await prisma.rolePermission.count({
    where: { roleId: superAdminRole.id },
  });
  const teacherPerms = await prisma.rolePermission.count({
    where: { roleId: templateTeacher.id },
  });
  const parentPerms = await prisma.rolePermission.count({
    where: { roleId: templateParent.id },
  });

  if (superAdminPerms === 32) {
    pass(`SUPER_ADMIN has ${superAdminPerms} permissions`);
  } else {
    fail('SUPER_ADMIN permissions', `Expected 32, got ${superAdminPerms}`);
  }

  if (teacherPerms === 20) {
    pass(`TEACHER has ${teacherPerms} permissions`);
  } else {
    fail('TEACHER permissions', `Expected 20, got ${teacherPerms}`);
  }

  if (parentPerms === 10) {
    pass(`PARENT has ${parentPerms} permissions`);
  } else {
    fail('PARENT permissions', `Expected 10, got ${parentPerms}`);
  }

  // ================================================================
  // TEST 11: AuditLog tenant-scoped with institutionId
  // ================================================================
  console.log('\nTEST 11: AuditLog tenant-scoped with institutionId');
  const tenantLog = await prisma.auditLog.create({
    data: {
      userId: userNoInst.id,
      institutionId: instA.id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: userNoInst.id,
      newValues: { email: userNoInst.email },
      ipAddress: '127.0.0.1',
    },
  });
  const checkTenantLog = await prisma.auditLog.findUnique({
    where: { id: tenantLog.id },
    include: { institution: true },
  });
  if (checkTenantLog && checkTenantLog.institutionId === instA.id) {
    pass('AuditLog with institutionId created correctly');
  } else {
    fail('Tenant AuditLog', 'institutionId missing or incorrect');
  }

  // ================================================================
  // TEST 12: AuditLog global with institutionId null
  // ================================================================
  console.log('\nTEST 12: AuditLog global with institutionId null');
  const globalLog = await prisma.auditLog.create({
    data: {
      userId: userNoInst.id,
      institutionId: null,
      action: 'SYSTEM_STARTUP',
      entityType: 'System',
      ipAddress: '127.0.0.1',
    },
  });
  const checkGlobalLog = await prisma.auditLog.findUnique({
    where: { id: globalLog.id },
  });
  if (checkGlobalLog && checkGlobalLog.institutionId === null) {
    pass('AuditLog with null institutionId created correctly');
  } else {
    fail('Global AuditLog', 'institutionId should be null');
  }

  // ================================================================
  // CLEANUP
  // ================================================================
  console.log('\n--- Cleaning up test data ---');
  await cleanup();
  console.log('  Cleanup complete.');

  // ================================================================
  // SUMMARY
  // ================================================================
  console.log('\n=== TEST SUMMARY ===');
  console.log(`  PASS: ${passed}`);
  console.log(`  FAIL: ${failed}`);
  console.log(`  TOTAL: ${passed + failed}`);

  if (failed > 0) {
    console.log('\n  SOME TESTS FAILED!');
    process.exit(1);
  } else {
    console.log('\n  ALL TESTS PASSED!');
  }
}

main()
  .catch((e) => {
    console.error('Tests failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
