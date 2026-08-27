import { PrismaService } from '../prisma';

export interface ParentContext {
  isParent: boolean;
  studentIds: string[];
}

/**
 * Resolves whether a user is a parent and returns their linked student IDs.
 * Used by services that need to filter data for parent users.
 */
export async function resolveParentContext(
  prisma: PrismaService,
  institutionId: string,
  userId: string,
): Promise<ParentContext> {
  const guardianLinks = await prisma.guardianStudent.findMany({
    where: {
      guardianUserId: userId,
      status: 'ACTIVE',
      student: { institutionId },
    },
    select: { studentId: true },
  });

  if (guardianLinks.length === 0) {
    return { isParent: false, studentIds: [] };
  }

  return {
    isParent: true,
    studentIds: guardianLinks.map((gl) => gl.studentId),
  };
}

/**
 * Finds all guardian user IDs for a set of students within an institution.
 * Used for notification fan-out to guardians.
 */
export async function findGuardianUserIds(
  prisma: PrismaService,
  institutionId: string,
  studentIds: string[],
): Promise<string[]> {
  if (studentIds.length === 0) return [];

  const guardianLinks = await prisma.guardianStudent.findMany({
    where: {
      studentId: { in: studentIds },
      status: 'ACTIVE',
      student: { institutionId },
    },
    select: { guardianUserId: true },
  });

  return [...new Set(guardianLinks.map((gl) => gl.guardianUserId))];
}
