import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuthorizationService } from '../auth/authorization/authorization.service';

export interface ReportsAccessResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Resource-level authorization for the Reports module.
 *
 * Semantics:
 *  - SUPER_ADMIN        : DENIED (no functional access to school data, no bypass).
 *  - INSTITUTION_ADMIN  : full access within the tenant.
 *  - TEACHER            : read / export on students of courses to which the
 *                         teacher is actively assigned (matching academic
 *                         period when provided). Cannot cross to other courses.
 *  - PARENT             : read-only on linked children.
 *  - STUDENT            : read-only on own records.
 */
@Injectable()
export class ReportsAuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canAccessStudent(
    userId: string,
    institutionId: string,
    studentId: string,
    academicPeriodId: string | null,
    role: string,
  ): Promise<ReportsAccessResult> {
    if (role === 'SUPER_ADMIN') {
      return { allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' };
    }

    if (role === 'INSTITUTION_ADMIN') {
      return { allowed: true };
    }

    if (role === 'TEACHER') {
      const hasRelationship = await this.isTeacherRelatedToStudent(
        userId,
        institutionId,
        studentId,
        academicPeriodId,
      );
      if (!hasRelationship) {
        return { allowed: false, reason: 'NO_STUDENT_RELATIONSHIP' };
      }
      return { allowed: true };
    }

    if (role === 'PARENT') {
      if (!(await this.isParentLinked(userId, institutionId, studentId))) {
        return { allowed: false, reason: 'NO_STUDENT_RELATIONSHIP' };
      }
      return { allowed: true };
    }

    if (role === 'STUDENT') {
      if (!(await this.isOwnStudent(userId, institutionId, studentId))) {
        return { allowed: false, reason: 'NO_STUDENT_RELATIONSHIP' };
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'NO_ROLE' };
  }

  async canAccessCourse(
    userId: string,
    institutionId: string,
    courseId: string,
    academicPeriodId: string | null,
    role: string,
  ): Promise<ReportsAccessResult> {
    if (role === 'SUPER_ADMIN') {
      return { allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' };
    }

    if (role === 'INSTITUTION_ADMIN') {
      return { allowed: true };
    }

    if (role === 'TEACHER') {
      const assignment = await this.prisma.teacherAssignment.findFirst({
        where: {
          teacherUserId: userId,
          institutionId,
          courseId,
          academicPeriodId: academicPeriodId ?? undefined,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (!assignment) {
        return { allowed: false, reason: 'NO_COURSE_RELATIONSHIP' };
      }
      return { allowed: true };
    }

    if (role === 'PARENT') {
      const hasRelationship = await this.isParentRelatedToCourse(
        userId,
        institutionId,
        courseId,
        academicPeriodId,
      );
      if (!hasRelationship) {
        return { allowed: false, reason: 'NO_COURSE_RELATIONSHIP' };
      }
      return { allowed: true };
    }

    if (role === 'STUDENT') {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          institutionId,
          courseId,
          academicPeriodId: academicPeriodId ?? undefined,
          status: 'ACTIVE',
          student: { userId },
        },
        select: { id: true },
      });
      if (!enrollment) {
        return { allowed: false, reason: 'NO_COURSE_RELATIONSHIP' };
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'NO_ROLE' };
  }

  async getUserRole(userId: string, institutionId: string): Promise<string | null> {
    const globalRoles = await this.authorizationService.getGlobalPermissionCodes(userId);
    if (globalRoles.length > 0) {
      const userRoles = await this.authorizationService.getUserRoles(userId, institutionId);
      const roleNames = userRoles.map((r) => r.name);
      if (roleNames.includes('INSTITUTION_ADMIN')) return 'INSTITUTION_ADMIN';
      if (roleNames.includes('TEACHER')) return 'TEACHER';
      if (roleNames.includes('PARENT')) return 'PARENT';
      if (roleNames.includes('STUDENT')) return 'STUDENT';

      const hasGlobalRole = await this.prisma.globalUserRole.findFirst({
        where: { userId },
      });
      if (hasGlobalRole) return 'SUPER_ADMIN';
    }

    const roles = await this.authorizationService.getUserRoles(userId, institutionId);
    if (roles.length === 0) return null;

    const roleNames = roles.map((r) => r.name);
    if (roleNames.includes('INSTITUTION_ADMIN')) return 'INSTITUTION_ADMIN';
    if (roleNames.includes('TEACHER')) return 'TEACHER';
    if (roleNames.includes('PARENT')) return 'PARENT';
    if (roleNames.includes('STUDENT')) return 'STUDENT';
    return null;
  }

  private async isTeacherRelatedToStudent(
    userId: string,
    institutionId: string,
    studentId: string,
    academicPeriodId: string | null,
  ): Promise<boolean> {
    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: {
        teacherUserId: userId,
        institutionId,
        status: 'ACTIVE',
        academicPeriodId: academicPeriodId ?? undefined,
        course: {
          enrollments: {
            some: {
              studentId,
              status: 'ACTIVE',
              ...(academicPeriodId ? { academicPeriodId } : {}),
            },
          },
        },
      },
      select: { id: true },
    });
    return !!assignment;
  }

  private async isParentRelatedToCourse(
    userId: string,
    institutionId: string,
    courseId: string,
    academicPeriodId: string | null,
  ): Promise<boolean> {
    const link = await this.prisma.guardianStudent.findFirst({
      where: {
        guardianUserId: userId,
        institutionId,
        status: 'ACTIVE',
        student: {
          enrollments: {
            some: {
              courseId,
              status: 'ACTIVE',
              ...(academicPeriodId ? { academicPeriodId } : {}),
            },
          },
        },
      },
      select: { id: true },
    });
    return !!link;
  }

  private async isParentLinked(
    userId: string,
    institutionId: string,
    studentId: string,
  ): Promise<boolean> {
    const link = await this.prisma.guardianStudent.findUnique({
      where: {
        institutionId_guardianUserId_studentId: {
          institutionId,
          guardianUserId: userId,
          studentId,
        },
      },
    });
    return !!link && link.status === 'ACTIVE';
  }

  private async isOwnStudent(
    userId: string,
    institutionId: string,
    studentId: string,
  ): Promise<boolean> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true, institutionId: true },
    });
    return !!student && student.userId === userId && student.institutionId === institutionId;
  }
}
