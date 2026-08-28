import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { AuthorizationService } from '../../modules/auth/authorization/authorization.service';
import { FollowUpConfidentiality, FollowUpStatus } from '@prisma/client';

const CONFIDENTIALITY_VISIBILITY: Record<string, FollowUpConfidentiality[]> = {
  INSTITUTION_ADMIN: [
    FollowUpConfidentiality.PUBLIC,
    FollowUpConfidentiality.INTERNAL,
    FollowUpConfidentiality.CONFIDENTIAL,
    FollowUpConfidentiality.SENSITIVE,
  ],
  TEACHER: [FollowUpConfidentiality.PUBLIC, FollowUpConfidentiality.INTERNAL],
  PARENT: [FollowUpConfidentiality.PUBLIC, FollowUpConfidentiality.INTERNAL],
  STUDENT: [FollowUpConfidentiality.PUBLIC, FollowUpConfidentiality.INTERNAL],
};

export interface FollowUpAccessResult {
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class StudentFollowUpAuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canRead(
    userId: string,
    institutionId: string,
    followUpId: string,
  ): Promise<FollowUpAccessResult> {
    const role = await this.getUserRole(userId, institutionId);
    if (!role) {
      return { allowed: false, reason: 'NO_ROLE' };
    }

    if (role === 'SUPER_ADMIN') {
      return { allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' };
    }

    const followUp = await this.prisma.studentFollowUp.findUnique({
      where: { id: followUpId },
      select: { institutionId: true, studentId: true, confidentiality: true },
    });

    if (!followUp || followUp.institutionId !== institutionId) {
      return { allowed: false, reason: 'NOT_FOUND' };
    }

    if (role === 'INSTITUTION_ADMIN') {
      return this.checkConfidentialityAccess(role, followUp.confidentiality);
    }

    const hasRelationship = await this.hasStudentRelationship(
      userId,
      institutionId,
      followUp.studentId,
      role,
    );

    if (!hasRelationship) {
      return { allowed: false, reason: 'NO_STUDENT_RELATIONSHIP' };
    }

    return this.checkConfidentialityAccess(role, followUp.confidentiality);
  }

  async canCreate(
    userId: string,
    institutionId: string,
    studentId: string,
  ): Promise<FollowUpAccessResult> {
    const role = await this.getUserRole(userId, institutionId);
    if (!role) {
      return { allowed: false, reason: 'NO_ROLE' };
    }

    if (role === 'SUPER_ADMIN') {
      return { allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' };
    }

    if (role === 'PARENT' || role === 'STUDENT') {
      return { allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' };
    }

    const hasRelationship = await this.hasStudentRelationship(
      userId,
      institutionId,
      studentId,
      role,
    );

    if (!hasRelationship) {
      return { allowed: false, reason: 'NO_STUDENT_RELATIONSHIP' };
    }

    return { allowed: true };
  }

  async canUpdate(
    userId: string,
    institutionId: string,
    followUpId: string,
  ): Promise<FollowUpAccessResult> {
    const role = await this.getUserRole(userId, institutionId);
    if (!role) {
      return { allowed: false, reason: 'NO_ROLE' };
    }

    if (role === 'SUPER_ADMIN') {
      return { allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' };
    }

    if (role === 'PARENT' || role === 'STUDENT') {
      return { allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' };
    }

    const followUp = await this.prisma.studentFollowUp.findUnique({
      where: { id: followUpId },
      select: { institutionId: true, studentId: true, status: true },
    });

    if (!followUp || followUp.institutionId !== institutionId) {
      return { allowed: false, reason: 'NOT_FOUND' };
    }

    if (followUp.status === FollowUpStatus.CLOSED) {
      return { allowed: false, reason: 'RECORD_CLOSED' };
    }

    const hasRelationship = await this.hasStudentRelationship(
      userId,
      institutionId,
      followUp.studentId,
      role,
    );

    if (!hasRelationship) {
      return { allowed: false, reason: 'NO_STUDENT_RELATIONSHIP' };
    }

    return { allowed: true };
  }

  async canClose(
    userId: string,
    institutionId: string,
    followUpId: string,
  ): Promise<FollowUpAccessResult> {
    const role = await this.getUserRole(userId, institutionId);
    if (!role) {
      return { allowed: false, reason: 'NO_ROLE' };
    }

    if (role === 'SUPER_ADMIN') {
      return { allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' };
    }

    if (role === 'PARENT' || role === 'STUDENT') {
      return { allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' };
    }

    const followUp = await this.prisma.studentFollowUp.findUnique({
      where: { id: followUpId },
      select: { institutionId: true, studentId: true, status: true },
    });

    if (!followUp || followUp.institutionId !== institutionId) {
      return { allowed: false, reason: 'NOT_FOUND' };
    }

    if (followUp.status === FollowUpStatus.CLOSED) {
      return { allowed: false, reason: 'ALREADY_CLOSED' };
    }

    const hasRelationship = await this.hasStudentRelationship(
      userId,
      institutionId,
      followUp.studentId,
      role,
    );

    if (!hasRelationship) {
      return { allowed: false, reason: 'NO_STUDENT_RELATIONSHIP' };
    }

    return { allowed: true };
  }

  async canManage(
    userId: string,
    institutionId: string,
  ): Promise<FollowUpAccessResult> {
    const role = await this.getUserRole(userId, institutionId);
    if (!role) {
      return { allowed: false, reason: 'NO_ROLE' };
    }

    if (role === 'SUPER_ADMIN') {
      return { allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' };
    }

    if (role !== 'INSTITUTION_ADMIN') {
      return { allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' };
    }

    return { allowed: true };
  }

  canViewConfidentiality(
    role: string,
    confidentiality: FollowUpConfidentiality,
  ): boolean {
    const allowed = CONFIDENTIALITY_VISIBILITY[role];
    if (!allowed) return false;
    return allowed.includes(confidentiality);
  }

  private checkConfidentialityAccess(
    role: string,
    confidentiality: FollowUpConfidentiality,
  ): FollowUpAccessResult {
    if (this.canViewConfidentiality(role, confidentiality)) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'CONFIDENTIALITY_RESTRICTED' };
  }

  getVisibleConfidentialityLevels(role: string): FollowUpConfidentiality[] {
    return CONFIDENTIALITY_VISIBILITY[role] || [];
  }

  buildListFilter(userId: string, institutionId: string, role: string) {
    if (role === 'INSTITUTION_ADMIN') {
      return { institutionId };
    }

    if (role === 'TEACHER') {
      return {
        institutionId,
        student: {
          enrollments: {
            some: {
              course: {
                teacherAssignments: {
                  some: { teacherUserId: userId, status: 'ACTIVE' },
                },
              },
            },
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

  private async getUserRole(
    userId: string,
    institutionId: string,
  ): Promise<string | null> {
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

  private async hasStudentRelationship(
    userId: string,
    institutionId: string,
    studentId: string,
    role: string,
  ): Promise<boolean> {
    if (role === 'INSTITUTION_ADMIN') {
      const membership = await this.prisma.userInstitution.findUnique({
        where: {
          userId_institutionId: { userId, institutionId },
          status: 'ACTIVE',
        },
      });
      return !!membership;
    }

    if (role === 'TEACHER') {
      const assignment = await this.prisma.teacherAssignment.findFirst({
        where: {
          teacherUserId: userId,
          status: 'ACTIVE',
          institutionId,
          course: {
            enrollments: {
              some: {
                studentId,
                status: 'ACTIVE',
              },
            },
          },
        },
      });
      return !!assignment;
    }

    if (role === 'PARENT') {
      const link = await this.prisma.guardianStudent.findUnique({
        where: {
          institutionId_guardianUserId_studentId: {
            institutionId,
            guardianUserId: userId,
            studentId,
          },
          status: 'ACTIVE',
        },
      });
      return !!link;
    }

    if (role === 'STUDENT') {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { userId: true, institutionId: true },
      });
      return !!student && student.userId === userId && student.institutionId === institutionId;
    }

    return false;
  }
}
