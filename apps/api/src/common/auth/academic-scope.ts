import { PrismaService } from '../prisma';

/** Roles with unrestricted visibility within their institution. */
export const FULL_ACCESS_ROLES = new Set([
  'SUPER_ADMIN',
  'INSTITUTION_ADMIN',
  'RECTOR',
  'COORDINADOR_ACADEMICO',
  'COORDINADOR_CONVIVENCIA',
  'ORIENTADOR',
  'PSICOLOGO',
]);

/** Roles scoped to courses they teach or direct. */
export const TEACHER_SCOPED_ROLES = new Set(['TEACHER', 'DIRECTOR_DE_GRUPO']);

export async function getUserRoleNames(
  prisma: PrismaService,
  institutionId: string,
  userId: string,
): Promise<string[]> {
  const membership = await prisma.userInstitution.findUnique({
    where: { userId_institutionId: { userId, institutionId } },
    select: { id: true },
  });
  if (!membership) {
    const globalAdmin = await prisma.globalUserRole.findFirst({
      where: { userId, role: { name: 'SUPER_ADMIN' } },
    });
    return globalAdmin ? ['SUPER_ADMIN'] : [];
  }
  const userRoles = await prisma.userRole.findMany({
    where: { userInstitutionId: membership.id },
    include: { role: { select: { name: true } } },
  });
  const tenantRoles = userRoles.map((ur) => ur.role.name);
  if (tenantRoles.length === 0) {
    const globalAdmin = await prisma.globalUserRole.findFirst({
      where: { userId, role: { name: 'SUPER_ADMIN' } },
    });
    if (globalAdmin) tenantRoles.push('SUPER_ADMIN');
  }
  return tenantRoles;
}

export function hasFullAccess(roleNames: string[]): boolean {
  return roleNames.some((n) => FULL_ACCESS_ROLES.has(n));
}

/**
 * Returns null for unrestricted access, otherwise the allowed student ids
 * (own student record + linked children + students of taught/directed courses).
 */
export async function resolveAccessibleStudentIds(
  prisma: PrismaService,
  institutionId: string,
  userId: string,
): Promise<string[] | null> {
  const roleNames = await getUserRoleNames(prisma, institutionId, userId);
  if (roleNames.length === 0) return [];
  if (hasFullAccess(roleNames)) return null;

  const allowed = new Set<string>();

  if (roleNames.some((n) => TEACHER_SCOPED_ROLES.has(n))) {
    const [assignments, directions] = await Promise.all([
      prisma.teacherAssignment.findMany({
        where: { institutionId, teacherUserId: userId, status: 'ACTIVE' },
        select: { courseId: true },
      }),
      prisma.courseDirectorAssignment.findMany({
        where: { institutionId, directorUserId: userId, status: 'ACTIVE' },
        select: { courseId: true },
      }),
    ]);
    const courseIds = [
      ...new Set([...assignments.map((a) => a.courseId), ...directions.map((d) => d.courseId)]),
    ];
    if (courseIds.length > 0) {
      const enrollments = await prisma.enrollment.findMany({
        where: { institutionId, courseId: { in: courseIds }, status: 'ACTIVE' },
        select: { studentId: true },
      });
      for (const e of enrollments) allowed.add(e.studentId);
    }
  }

  if (roleNames.includes('STUDENT')) {
    const own = await prisma.student.findFirst({
      where: { institutionId, userId },
      select: { id: true },
    });
    if (own) allowed.add(own.id);
  }

  const linked = await prisma.guardianStudent.findMany({
    where: { guardianUserId: userId, institutionId, status: 'ACTIVE' },
    select: { studentId: true },
  });
  for (const gs of linked) allowed.add(gs.studentId);

  return [...allowed];
}

/**
 * Returns null for unrestricted access, otherwise the allowed course ids
 * (taught/directed courses + enrolled course + children's courses).
 */
export async function resolveAccessibleCourseIds(
  prisma: PrismaService,
  institutionId: string,
  userId: string,
): Promise<string[] | null> {
  const roleNames = await getUserRoleNames(prisma, institutionId, userId);
  if (roleNames.length === 0) return [];
  if (hasFullAccess(roleNames)) return null;

  const allowed = new Set<string>();

  if (roleNames.some((n) => TEACHER_SCOPED_ROLES.has(n))) {
    const [assignments, directions] = await Promise.all([
      prisma.teacherAssignment.findMany({
        where: { institutionId, teacherUserId: userId, status: 'ACTIVE' },
        select: { courseId: true },
      }),
      prisma.courseDirectorAssignment.findMany({
        where: { institutionId, directorUserId: userId, status: 'ACTIVE' },
        select: { courseId: true },
      }),
    ]);
    for (const a of assignments) allowed.add(a.courseId);
    for (const d of directions) allowed.add(d.courseId);
  }

  // Own enrollment (STUDENT role via Student.userId link).
  const ownStudent = await prisma.student.findFirst({
    where: { institutionId, userId },
    select: { id: true },
  });
  // Linked children (PARENT role via GuardianStudent).
  const linked = await prisma.guardianStudent.findMany({
    where: { guardianUserId: userId, institutionId, status: 'ACTIVE' },
    select: { studentId: true },
  });
  const studentIds = new Set<string>();
  if (ownStudent) studentIds.add(ownStudent.id);
  for (const gs of linked) studentIds.add(gs.studentId);
  if (studentIds.size > 0) {
    const enrollments = await prisma.enrollment.findMany({
      where: { institutionId, studentId: { in: [...studentIds] }, status: 'ACTIVE' },
      select: { courseId: true },
    });
    for (const e of enrollments) allowed.add(e.courseId);
  }

  return [...allowed];
}
