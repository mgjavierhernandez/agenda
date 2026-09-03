import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuthorizationService } from '../auth/authorization/authorization.service';

export interface AttendanceAccessResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Resource-level authorization for the Attendance module.
 *
 * Semantics:
 *  - SUPER_ADMIN        : DENIED (no functional access to school data, no bypass).
 *  - INSTITUTION_ADMIN  : full access within the tenant.
 *  - TEACHER            : read / register / update on students of courses to which
 *                         the teacher is actively assigned (and matching academic
 *                         period). Cannot delete.
 *  - PARENT             : read-only on linked children.
 *  - STUDENT            : read-only on own records.
 */
@Injectable()
export class AttendanceAuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canCreate(
    userId: string,
    institutionId: string,
    studentId: string,
    courseId: string,
    academicPeriodId: string,
    role: string,
  ): Promise<AttendanceAccessResult> {
    if (role === 'SUPER_ADMIN') {
      return { allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' };
    }

    if (role === 'PARENT' || role === 'STUDENT') {
      return { allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' };
    }

    if (role === 'TEACHER') {
      if (!(await this.isTeacherAssigned(userId, institutionId, courseId, academicPeriodId))) {
        return { allowed: false, reason: 'NO_COURSE_RELATIONSHIP' };
      }
      if (!(await this.isStudentEnrolled(institutionId, studentId, courseId, academicPeriodId))) {
        return { allowed: false, reason: 'NO_STUDENT_RELATIONSHIP' };
      }
      return { allowed: true };
    }

    // INSTITUTION_ADMIN
    if (role === 'INSTITUTION_ADMIN') {
      return { allowed: true };
    }

    return { allowed: false, reason: 'NO_ROLE' };
  }

  async canRead(
    userId: string,
    institutionId: string,
    attendance: { studentId: string; courseId: string; academicPeriodId: string },
    role: string,
  ): Promise<AttendanceAccessResult> {
    if (role === 'SUPER_ADMIN') {
      return { allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' };
    }

    if (role === 'INSTITUTION_ADMIN') {
      return { allowed: true };
    }

    if (role === 'TEACHER') {
      if (!(await this.isTeacherAssigned(userId, institutionId, attendance.courseId, attendance.academicPeriodId))) {
        return { allowed: false, reason: 'NO_COURSE_RELATIONSHIP' };
      }
      return { allowed: true };
    }

    if (role === 'PARENT') {
      if (!(await this.isParentLinked(userId, institutionId, attendance.studentId))) {
        return { allowed: false, reason: 'NO_STUDENT_RELATIONSHIP' };
      }
      return { allowed: true };
    }

    if (role === 'STUDENT') {
      if (!(await this.isOwnStudent(userId, institutionId, attendance.studentId))) {
        return { allowed: false, reason: 'NO_STUDENT_RELATIONSHIP' };
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'NO_ROLE' };
  }

  async canModify(
    userId: string,
    institutionId: string,
    attendance: { studentId: string; courseId: string; academicPeriodId: string },
    role: string,
  ): Promise<AttendanceAccessResult> {
    if (role === 'SUPER_ADMIN') {
      return { allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' };
    }

    if (role === 'PARENT' || role === 'STUDENT') {
      return { allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' };
    }

    if (role === 'INSTITUTION_ADMIN') {
      return { allowed: true };
    }

    if (role === 'TEACHER') {
      if (!(await this.isTeacherAssigned(userId, institutionId, attendance.courseId, attendance.academicPeriodId))) {
        return { allowed: false, reason: 'NO_COURSE_RELATIONSHIP' };
      }
      return { allowed: true };
    }

    return { allowed: false, reason: 'NO_ROLE' };
  }

  async canDelete(
    userId: string,
    institutionId: string,
    attendance: { studentId: string; courseId: string; academicPeriodId: string },
    role: string,
  ): Promise<AttendanceAccessResult> {
    if (role === 'SUPER_ADMIN') {
      return { allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' };
    }

    if (role === 'INSTITUTION_ADMIN') {
      return { allowed: true };
    }

    // TEACHER / PARENT / STUDENT cannot delete
    return { allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' };
  }

  buildListFilter(
    userId: string,
    institutionId: string,
    role: string,
  ): Record<string, unknown> {
    if (role === 'INSTITUTION_ADMIN') {
      return { institutionId };
    }

    if (role === 'TEACHER') {
      return {
        institutionId,
        course: {
          teacherAssignments: {
            some: { teacherUserId: userId, status: 'ACTIVE' },
          },
        },
      };
    }

    if (role === 'PARENT') {
      return {
        institutionId,
        student: {
          guardianStudents: {
            some: { guardianUserId: userId, status: 'ACTIVE' },
          },
        },
      };
    }

    if (role === 'STUDENT') {
      return {
        institutionId,
        student: { user: { id: userId } },
      };
    }

    return { id: '__NEVER_MATCH__' };
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

  private async isTeacherAssigned(
    userId: string,
    institutionId: string,
    courseId: string,
    academicPeriodId: string,
  ): Promise<boolean> {
    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: {
        teacherUserId: userId,
        institutionId,
        courseId,
        academicPeriodId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    return !!assignment;
  }

  private async isStudentEnrolled(
    institutionId: string,
    studentId: string,
    courseId: string,
    academicPeriodId: string,
  ): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        institutionId,
        studentId,
        courseId,
        academicPeriodId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    return !!enrollment;
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
