import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { AuthorizationService } from '../auth/authorization/authorization.service';
import { StudentFollowUpAuthorizationService } from '../../common/auth/student-follow-up-authorization';
import {
  CommunicationAudience,
  AgendaEventStatus,
  CommunicationStatus,
  SignatureRequestStatus,
  Student,
  Prisma,
} from '@prisma/client';

export type DashboardRole =
  | 'INSTITUTION_ADMIN'
  | 'SUPER_ADMIN'
  | 'RECTOR'
  | 'COORDINADOR_ACADEMICO'
  | 'COORDINADOR_CONVIVENCIA'
  | 'ORIENTADOR'
  | 'PSICOLOGO'
  | 'DIRECTOR_DE_GRUPO'
  | 'TEACHER'
  | 'PARENT'
  | 'STUDENT';

export interface StudentBrief {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
}

export interface CourseBrief {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface DashboardData {
  role: DashboardRole;
  activePeriod: {
    id: string;
    name: string;
    code: string;
    startDate: Date;
    endDate: Date;
    status: string;
  } | null;
  stats: Record<string, number>;
  children: StudentBrief[];
  courses: CourseBrief[];
  subjects: Array<{ id: string; code: string; name: string; status: string }>;
  recentNotifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    status: string;
    createdAt: Date;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
    location: string | null;
  }>;
  recentCommunications: Array<{
    id: string;
    title: string;
    content: string;
    publishedAt: Date | null;
  }>;
  pendingSignatures: Array<{
    id: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
  }>;
  followUps: Array<{
    id: string;
    title: string;
    confidentiality: string;
    status: string;
    createdAt: Date;
    studentId: string;
  }>;
  pendingCommitments: Array<{
    id: string;
    description: string;
    status: string;
    dueDate: Date | null;
  }>;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly followUpAuthorization: StudentFollowUpAuthorizationService,
  ) {}

  async getDashboard(
    userId: string,
    institutionId: string,
    periodId?: string,
  ): Promise<DashboardData> {
    const role = await this.resolveRole(userId, institutionId);
    if (!role) {
      throw new ForbiddenException('No active role for this institution');
    }

    if (periodId) {
      const period = await this.prisma.academicPeriod.findFirst({
        where: { id: periodId, institutionId },
      });
      if (!period) {
        throw new ForbiddenException('Academic period not found in this institution');
      }
    }

    const resolvedPeriodId = periodId ?? undefined;

    const [activePeriod, recentNotifications, upcomingEvents, followUpsList, pendingCommitments] =
      await Promise.all([
        resolvedPeriodId
          ? this.getPeriodById(resolvedPeriodId)
          : this.getActivePeriod(institutionId),
        this.getRecentNotifications(userId, institutionId),
        this.getUpcomingEvents(institutionId, role),
        this.getFollowUps(userId, institutionId, role),
        this.getPendingCommitments(userId, institutionId, role),
      ]);

    const [stats, children, courses, subjects, recentCommunications, pendingSignatures] =
      await Promise.all([
        this.getStats(userId, institutionId, role, resolvedPeriodId),
        this.getChildren(userId, institutionId, role),
        this.getCourses(userId, institutionId, role, resolvedPeriodId),
        this.getSubjects(userId, institutionId, role, resolvedPeriodId),
        this.getRecentCommunications(institutionId, role),
        this.getPendingSignatures(userId, institutionId),
      ]);

    return {
      role,
      activePeriod,
      stats,
      children,
      courses,
      subjects,
      recentNotifications,
      upcomingEvents,
      recentCommunications,
      pendingSignatures,
      followUps: followUpsList,
      pendingCommitments,
    };
  }

  private async resolveRole(userId: string, institutionId: string): Promise<DashboardRole | null> {
    const roles = await this.authorizationService.getUserRoles(userId, institutionId);
    const names = roles.map((r) => r.name);

    if (names.includes('INSTITUTION_ADMIN')) return 'INSTITUTION_ADMIN';
    if (names.includes('RECTOR')) return 'RECTOR';
    if (names.includes('COORDINADOR_ACADEMICO')) return 'COORDINADOR_ACADEMICO';
    if (names.includes('COORDINADOR_CONVIVENCIA')) return 'COORDINADOR_CONVIVENCIA';
    if (names.includes('ORIENTADOR')) return 'ORIENTADOR';
    if (names.includes('PSICOLOGO')) return 'PSICOLOGO';
    if (names.includes('DIRECTOR_DE_GRUPO')) return 'DIRECTOR_DE_GRUPO';
    if (names.includes('TEACHER')) return 'TEACHER';
    if (names.includes('PARENT')) return 'PARENT';
    if (names.includes('STUDENT')) return 'STUDENT';

    const globalAccounts = await this.authorizationService.getGlobalPermissionCodes(userId);
    if (globalAccounts.length > 0) {
      const globalAdmin = await this.prisma.globalUserRole.findFirst({
        where: { userId, role: { name: 'SUPER_ADMIN' } },
      });
      if (globalAdmin) return 'SUPER_ADMIN';
    }

    return null;
  }

  private async getActivePeriod(institutionId: string) {
    return this.prisma.academicPeriod.findFirst({
      where: { institutionId, status: 'ACTIVE' },
      orderBy: { startDate: 'asc' },
      select: { id: true, name: true, code: true, startDate: true, endDate: true, status: true },
    });
  }

  private async getPeriodById(periodId: string) {
    return this.prisma.academicPeriod.findUnique({
      where: { id: periodId },
      select: { id: true, name: true, code: true, startDate: true, endDate: true, status: true },
    });
  }

  private async getStats(
    userId: string,
    institutionId: string,
    role: DashboardRole,
    periodId?: string,
  ): Promise<Record<string, number>> {
    if (
      role === 'INSTITUTION_ADMIN' ||
      role === 'SUPER_ADMIN' ||
      role === 'RECTOR' ||
      role === 'COORDINADOR_ACADEMICO' ||
      role === 'COORDINADOR_CONVIVENCIA' ||
      role === 'ORIENTADOR' ||
      role === 'PSICOLOGO'
    ) {
      const [students, teachers, courses, subjects, pendingFollowUps] = await Promise.all([
        this.prisma.student.count({ where: { institutionId, status: 'ACTIVE' } }),
        this.prisma.userInstitution.count({
          where: {
            institutionId,
            status: 'ACTIVE',
            roles: { some: { role: { name: 'TEACHER' } } },
          },
        }),
        this.prisma.course.count({ where: { institutionId, status: 'ACTIVE' } }),
        this.prisma.subject.count({ where: { institutionId, status: 'ACTIVE' } }),
        this.prisma.studentFollowUp.count({
          where: {
            institutionId,
            status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING_FOLLOW_UP', 'ESCALATED'] },
          },
        }),
      ]);
      return { students, teachers, courses, subjects, pendingFollowUps };
    }

    if (role === 'TEACHER' || role === 'DIRECTOR_DE_GRUPO') {
      const assignmentWhere: Prisma.TeacherAssignmentWhereInput = {
        institutionId,
        teacherUserId: userId,
        status: 'ACTIVE',
      };
      if (periodId) assignmentWhere.academicPeriodId = periodId;

      const activeAssignments = await this.prisma.teacherAssignment.findMany({
        where: assignmentWhere,
        select: { courseId: true },
        distinct: ['courseId'],
      });
      const courseIds = activeAssignments.map((a) => a.courseId);
      const students = courseIds.length
        ? (
            await this.prisma.enrollment.findMany({
              where: {
                institutionId,
                status: 'ACTIVE',
                courseId: { in: courseIds },
                ...(periodId ? { academicPeriodId: periodId } : {}),
              },
              distinct: ['studentId'],
              select: { studentId: true },
            })
          ).length
        : 0;
      return { courses: courseIds.length, students };
    }

    if (role === 'PARENT') {
      const children = await this.prisma.guardianStudent.count({
        where: { institutionId, guardianUserId: userId, status: 'ACTIVE' },
      });
      return { children };
    }

    // STUDENT
    const student = await this.getOwnStudent(userId, institutionId);
    if (!student) return {};
    const enrollmentWhere: Prisma.EnrollmentWhereInput = {
      institutionId,
      studentId: student.id,
      status: 'ACTIVE',
    };
    if (periodId) enrollmentWhere.academicPeriodId = periodId;

    const [enrollments, followUps] = await Promise.all([
      this.prisma.enrollment.count({ where: enrollmentWhere }),
      this.prisma.studentFollowUp.count({ where: { institutionId, studentId: student.id } }),
    ]);
    return { enrollments, followUps };
  }

  private async getChildren(
    userId: string,
    institutionId: string,
    role: DashboardRole,
  ): Promise<StudentBrief[]> {
    if (role !== 'PARENT') return [];
    const links = await this.prisma.guardianStudent.findMany({
      where: { institutionId, guardianUserId: userId, status: 'ACTIVE' },
      select: { student: { select: { id: true, firstName: true, lastName: true, status: true } } },
    });
    return links.map((l) => ({
      id: l.student.id,
      firstName: l.student.firstName,
      lastName: l.student.lastName,
      status: l.student.status,
    }));
  }

  private async getCourses(
    userId: string,
    institutionId: string,
    role: DashboardRole,
    periodId?: string,
  ): Promise<CourseBrief[]> {
    if (role === 'TEACHER' || role === 'DIRECTOR_DE_GRUPO') {
      const assignmentWhere: Prisma.TeacherAssignmentWhereInput = {
        institutionId,
        teacherUserId: userId,
        status: 'ACTIVE',
      };
      if (periodId) assignmentWhere.academicPeriodId = periodId;

      const directorWhere: Prisma.CourseDirectorAssignmentWhereInput = {
        institutionId,
        directorUserId: userId,
        status: 'ACTIVE',
      };
      if (periodId) directorWhere.academicPeriodId = periodId;

      const [assignments, directions] = await Promise.all([
        this.prisma.teacherAssignment.findMany({
          where: assignmentWhere,
          select: {
            course: { select: { id: true, code: true, name: true, status: true } },
          },
          distinct: ['courseId'],
        }),
        role === 'DIRECTOR_DE_GRUPO'
          ? this.prisma.courseDirectorAssignment.findMany({
              where: directorWhere,
              select: {
                course: { select: { id: true, code: true, name: true, status: true } },
              },
            })
          : Promise.resolve([] as Array<{ course: CourseBrief }>),
      ]);
      const seen = new Map<string, CourseBrief>();
      for (const a of [...assignments, ...directions]) {
        if (!seen.has(a.course.id)) {
          seen.set(a.course.id, {
            id: a.course.id,
            code: a.course.code,
            name: a.course.name,
            status: a.course.status,
          });
        }
      }
      return [...seen.values()];
    }

    if (role === 'STUDENT') {
      const student = await this.getOwnStudent(userId, institutionId);
      if (!student) return [];
      const enrollmentWhere: Prisma.EnrollmentWhereInput = {
        institutionId,
        studentId: student.id,
        status: 'ACTIVE',
      };
      if (periodId) enrollmentWhere.academicPeriodId = periodId;

      const enrollments = await this.prisma.enrollment.findMany({
        where: enrollmentWhere,
        select: {
          course: { select: { id: true, code: true, name: true, status: true } },
        },
      });
      return enrollments.map((e) => ({
        id: e.course.id,
        code: e.course.code,
        name: e.course.name,
        status: e.course.status,
      }));
    }

    return [];
  }

  private async getSubjects(
    userId: string,
    institutionId: string,
    role: DashboardRole,
    periodId?: string,
  ) {
    if (role === 'TEACHER' || role === 'DIRECTOR_DE_GRUPO') {
      const assignmentWhere: Prisma.TeacherAssignmentWhereInput = {
        institutionId,
        teacherUserId: userId,
        status: 'ACTIVE',
      };
      if (periodId) assignmentWhere.academicPeriodId = periodId;

      const assignments = await this.prisma.teacherAssignment.findMany({
        where: assignmentWhere,
        select: { subject: { select: { id: true, code: true, name: true, status: true } } },
        distinct: ['subjectId'],
      });
      return assignments.map((a) => ({
        id: a.subject.id,
        code: a.subject.code,
        name: a.subject.name,
        status: a.subject.status,
      }));
    }
    return [];
  }

  private async getOwnStudent(userId: string, institutionId: string): Promise<Student | null> {
    return this.prisma.student.findFirst({
      where: { institutionId, userId },
    });
  }

  private async getRecentNotifications(userId: string, institutionId: string) {
    return this.prisma.notification.findMany({
      where: { institutionId, userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        status: true,
        createdAt: true,
      },
    });
  }

  private async getUpcomingEvents(institutionId: string, role: DashboardRole) {
    const now = new Date();
    const events = await this.prisma.agendaEvent.findMany({
      where: { institutionId, status: AgendaEventStatus.ACTIVE, startAt: { gte: now } },
      orderBy: { startAt: 'asc' },
      take: 5,
      select: {
        id: true,
        title: true,
        description: true,
        startAt: true,
        endAt: true,
        location: true,
        audience: true,
      },
    });

    return events
      .filter((e) => this.eventVisibleToRole(e.audience, role))
      .map(({ id, title, description, startAt, endAt, location }) => ({
        id,
        title,
        description,
        startAt,
        endAt,
        location,
      }));
  }

  private eventVisibleToRole(audience: CommunicationAudience, role: DashboardRole): boolean {
    if (audience === CommunicationAudience.ALL) return true;
    const staffAdmin =
      role === 'INSTITUTION_ADMIN' ||
      role === 'SUPER_ADMIN' ||
      role === 'RECTOR' ||
      role === 'COORDINADOR_ACADEMICO' ||
      role === 'COORDINADOR_CONVIVENCIA' ||
      role === 'ORIENTADOR' ||
      role === 'PSICOLOGO';
    if (staffAdmin) return true;
    if (audience === CommunicationAudience.TEACHERS)
      return role === 'TEACHER' || role === 'DIRECTOR_DE_GRUPO';
    if (audience === CommunicationAudience.PARENTS) return role === 'PARENT';
    if (audience === CommunicationAudience.STUDENTS) return role === 'STUDENT';
    return false;
  }

  private async getRecentCommunications(institutionId: string, role: DashboardRole) {
    const events = await this.prisma.communication.findMany({
      where: { institutionId, status: CommunicationStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        content: true,
        publishedAt: true,
        audience: true,
      },
    });
    return events
      .filter((e) => this.eventVisibleToRole(e.audience, role))
      .map(({ id, title, content, publishedAt }) => ({ id, title, content, publishedAt }));
  }

  private async getPendingSignatures(userId: string, institutionId: string) {
    const rows = await this.prisma.signatureRecipient.findMany({
      where: {
        userId,
        status: 'PENDING',
        signatureRequest: { institutionId, status: SignatureRequestStatus.PUBLISHED },
      },
      orderBy: { signatureRequest: { createdAt: 'desc' } },
      take: 5,
      select: {
        signatureRequest: {
          select: { id: true, title: true, description: true, dueDate: true },
        },
      },
    });
    return rows.map((r) => r.signatureRequest);
  }

  private async getFollowUps(userId: string, institutionId: string, role: DashboardRole) {
    // buildListFilter solo modela 4 roles: el staff directivo ve como
    // administración y el director de grupo como docente.
    const effectiveRole =
      role === 'SUPER_ADMIN' ||
      role === 'RECTOR' ||
      role === 'COORDINADOR_ACADEMICO' ||
      role === 'COORDINADOR_CONVIVENCIA' ||
      role === 'ORIENTADOR' ||
      role === 'PSICOLOGO'
        ? 'INSTITUTION_ADMIN'
        : role === 'DIRECTOR_DE_GRUPO'
          ? 'TEACHER'
          : role;
    const filter = this.followUpAuthorization.buildListFilter(
      userId,
      institutionId,
      effectiveRole,
    ) as Prisma.StudentFollowUpWhereInput;
    const rows = await this.prisma.studentFollowUp.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        confidentiality: true,
        status: true,
        createdAt: true,
        studentId: true,
      },
    });
    return rows;
  }

  private async getPendingCommitments(userId: string, institutionId: string, role: DashboardRole) {
    // Admin: all pending commitments in the institution.
    // SUPER_ADMIN is excluded (no functional access to school data).
    if (role === 'INSTITUTION_ADMIN') {
      const rows = await this.prisma.commitment.findMany({
        where: {
          followUp: { institutionId },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
        select: { id: true, description: true, status: true, dueDate: true },
      });
      return rows;
    }

    const rows = await this.prisma.commitment.findMany({
      where: {
        responsibleUserId: userId,
        followUp: { institutionId },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
      select: { id: true, description: true, status: true, dueDate: true },
    });
    return rows;
  }
}
