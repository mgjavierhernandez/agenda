import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ListAgendaQueryDto, AgendaEventType } from './dto/list-agenda-query.dto';
import { AgendaEventDto } from './dto/agenda-response.dto';
import { DayOfWeek, Prisma, CommunicationAudience } from '@prisma/client';

const DAY_OF_WEEK_MAP: Record<DayOfWeek, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
};

@Injectable()
export class AgendaService {
  private readonly logger = new Logger(AgendaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAgenda(
    institutionId: string,
    userId: string,
    query: ListAgendaQueryDto,
  ): Promise<{ data: AgendaEventDto[]; start: string; end: string; total: number }> {
    const startDate = new Date(query.start);
    const endDate = new Date(query.end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (startDate > endDate) {
      throw new BadRequestException('start must be before or equal to end');
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const maxMs = 62 * 24 * 60 * 60 * 1000;
    if (diffMs > maxMs) {
      throw new BadRequestException('Date range cannot exceed 62 days');
    }

    const userContext = await this.resolveUserContext(institutionId, userId, query.studentId);
    const eventTypes = query.eventTypes ?? [
      AgendaEventType.SCHEDULE,
      AgendaEventType.TASK,
      AgendaEventType.COMMUNICATION,
      AgendaEventType.SIGNATURE,
      AgendaEventType.EVENT,
    ];

    const queries: Promise<AgendaEventDto[]>[] = [];

    if (eventTypes.includes(AgendaEventType.SCHEDULE)) {
      queries.push(this.getScheduleEvents(institutionId, userContext, startDate, endDate));
    } else {
      queries.push(Promise.resolve([]));
    }

    if (eventTypes.includes(AgendaEventType.TASK)) {
      queries.push(this.getTaskEvents(institutionId, userContext, startDate, endDate));
    } else {
      queries.push(Promise.resolve([]));
    }

    if (eventTypes.includes(AgendaEventType.COMMUNICATION)) {
      queries.push(
        this.getCommunicationEvents(institutionId, userContext, startDate, endDate, userId),
      );
    } else {
      queries.push(Promise.resolve([]));
    }

    if (eventTypes.includes(AgendaEventType.SIGNATURE)) {
      queries.push(this.getSignatureEvents(institutionId, userContext, startDate, endDate));
    } else {
      queries.push(Promise.resolve([]));
    }

    if (eventTypes.includes(AgendaEventType.EVENT)) {
      queries.push(
        this.getAgendaEventItems(institutionId, userContext, startDate, endDate, userId),
      );
    } else {
      queries.push(Promise.resolve([]));
    }

    const [scheduleEvents, taskEvents, commEvents, sigEvents, agendaEventItems] =
      await Promise.all(queries);

    const allEvents = [
      ...scheduleEvents,
      ...taskEvents,
      ...commEvents,
      ...sigEvents,
      ...agendaEventItems,
    ];
    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const paginated = allEvents.slice(0, query.limit ?? 200);

    return {
      data: paginated,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      total: allEvents.length,
    };
  }

  private async resolveUserContext(
    institutionId: string,
    userId: string,
    requestedStudentId?: string,
  ): Promise<{
    role: 'student' | 'parent' | 'teacher' | 'admin';
    studentIds: string[];
    courseIds: string[];
    studentNames?: Record<string, string>;
  }> {
    const globalAdmin = await this.prisma.globalUserRole.findFirst({
      where: { userId, role: { name: 'SUPER_ADMIN' } },
    });
    if (globalAdmin) {
      return { role: 'admin', studentIds: [], courseIds: [] };
    }

    const membership = await this.prisma.userInstitution.findUnique({
      where: { userId_institutionId: { userId, institutionId } },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!membership) {
      return { role: 'admin', studentIds: [], courseIds: [] };
    }

    const roleNames = membership.roles.map((ur) => ur.role.name);

    if (roleNames.includes('INSTITUTION_ADMIN')) {
      return { role: 'admin', studentIds: [], courseIds: [] };
    }

    if (roleNames.includes('TEACHER')) {
      const teacherAssignments = await this.prisma.teacherAssignment.findMany({
        where: {
          institutionId,
          teacherUserId: userId,
          status: 'ACTIVE',
        },
        select: { courseId: true },
      });
      const courseIds = teacherAssignments.map((ta) => ta.courseId);
      return { role: 'teacher', studentIds: [], courseIds };
    }

    const student = await this.prisma.student.findFirst({
      where: { institutionId, userId },
      select: { id: true },
    });
    if (student) {
      return { role: 'student', studentIds: [student.id], courseIds: [] };
    }

    const guardianLinks = await this.prisma.guardianStudent.findMany({
      where: {
        guardianUserId: userId,
        status: 'ACTIVE',
        student: { institutionId },
      },
      select: { studentId: true },
    });
    if (guardianLinks.length > 0) {
      let studentIds = guardianLinks.map((gl) => gl.studentId);
      // Hijo seleccionado: restringir al vinculado solicitado; un ID ajeno
      // se ignora silenciosamente (se mantiene el conjunto de hijos).
      if (requestedStudentId && studentIds.includes(requestedStudentId)) {
        studentIds = [requestedStudentId];
      }
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          studentId: { in: studentIds },
          institutionId,
          status: 'ACTIVE',
        },
        select: { courseId: true },
      });
      const courseIds = [...new Set(enrollments.map((e) => e.courseId))];

      const students = await this.prisma.student.findMany({
        where: { id: { in: studentIds }, institutionId },
        select: { id: true, firstName: true, lastName: true },
      });
      const studentNames: Record<string, string> = {};
      for (const s of students) {
        studentNames[s.id] = `${s.firstName} ${s.lastName}`;
      }

      return { role: 'parent', studentIds, courseIds, studentNames };
    }

    return { role: 'admin', studentIds: [], courseIds: [] };
  }

  private async getScheduleEvents(
    institutionId: string,
    userContext: {
      role: string;
      studentIds: string[];
      courseIds: string[];
      studentNames?: Record<string, string>;
    },
    startDate: Date,
    endDate: Date,
  ): Promise<AgendaEventDto[]> {
    const where: Prisma.ScheduleWhereInput = {
      institutionId,
      status: 'ACTIVE',
    };

    if (userContext.role === 'teacher' && userContext.courseIds.length > 0) {
      where.courseId = { in: userContext.courseIds };
    } else if (userContext.role === 'student' || userContext.role === 'parent') {
      const courseIds = await this.getStudentCourseIds(institutionId, userContext.studentIds);
      if (courseIds.length === 0) return [];
      where.courseId = { in: courseIds };
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: {
        course: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        classroom: { select: { id: true, name: true } },
      },
    });

    const events: AgendaEventDto[] = [];
    const totalDays =
      Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    for (const schedule of schedules) {
      const scheduleDow = DAY_OF_WEEK_MAP[schedule.dayOfWeek];

      for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + dayOffset);
        const currentDow = currentDate.getDay();

        if (currentDow !== scheduleDow) continue;

        const startParts = this.parseTime(schedule.startTime);
        const endParts = this.parseTime(schedule.endTime);

        if (!startParts || !endParts) {
          this.logger.warn(
            `Skipping schedule ${schedule.id} due to invalid time data: startTime=${String(schedule.startTime)}, endTime=${String(schedule.endTime)}`,
          );
          continue;
        }

        const eventStart = new Date(currentDate);
        eventStart.setHours(startParts.hours, startParts.minutes, 0, 0);

        const eventEnd = new Date(currentDate);
        eventEnd.setHours(endParts.hours, endParts.minutes, 0, 0);

        events.push({
          id: `schedule-${schedule.id}-${currentDate.toISOString().split('T')[0]}`,
          type: AgendaEventType.SCHEDULE,
          title: `${schedule.course.name} — ${schedule.subject.name}`,
          description: schedule.classroom?.name ?? undefined,
          start: eventStart.toISOString(),
          end: eventEnd.toISOString(),
          allDay: false,
          status: 'ACTIVE',
          sourceId: schedule.id,
          sourceType: 'Schedule',
          route: `/schedules/${schedule.id}`,
          metadata: {
            courseId: schedule.courseId,
            subjectId: schedule.subjectId,
            classroom: schedule.classroom?.name ?? undefined,
            dayOfWeek: schedule.dayOfWeek,
            ...(userContext.role === 'parent' && userContext.studentNames
              ? {
                  studentName: this.findStudentNameForCourse(
                    schedule.courseId,
                    userContext.studentIds,
                    userContext.studentNames,
                  ),
                }
              : {}),
          },
        });
      }
    }

    return events;
  }

  private async getTaskEvents(
    institutionId: string,
    userContext: {
      role: string;
      studentIds: string[];
      courseIds: string[];
      studentNames?: Record<string, string>;
    },
    startDate: Date,
    endDate: Date,
  ): Promise<AgendaEventDto[]> {
    const where: Prisma.TaskWhereInput = {
      institutionId,
      status: 'PUBLISHED',
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (userContext.role === 'teacher' && userContext.courseIds.length > 0) {
      where.courseId = { in: userContext.courseIds };
    } else if (userContext.role === 'student' || userContext.role === 'parent') {
      const studentIds = userContext.studentIds;
      if (studentIds.length === 0) return [];

      const taskAssignments = await this.prisma.taskAssignment.findMany({
        where: {
          institutionId,
          studentId: { in: studentIds },
          status: { not: 'CANCELLED' },
        },
        select: { taskId: true },
      });
      const taskIds = [...new Set(taskAssignments.map((ta) => ta.taskId))];
      if (taskIds.length === 0) return [];
      where.id = { in: taskIds };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        course: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        ...(userContext.role === 'parent' && userContext.studentIds.length > 0
          ? {
              taskAssignments: {
                where: { studentId: { in: userContext.studentIds } },
                select: { studentId: true },
              },
            }
          : {}),
      },
    });

    return tasks.map((task) => {
      let studentName: string | undefined;
      if (userContext.role === 'parent' && userContext.studentNames && 'taskAssignments' in task) {
        const assignments = task.taskAssignments as { studentId: string }[] | undefined;
        if (assignments && assignments.length > 0) {
          studentName = userContext.studentNames[assignments[0].studentId];
        }
      }
      return {
        id: `task-${task.id}`,
        type: AgendaEventType.TASK,
        title: task.title,
        description: task.description ?? undefined,
        start: task.dueDate.toISOString(),
        allDay: false,
        status: task.status,
        sourceId: task.id,
        sourceType: 'Task',
        route: `/tasks/${task.id}`,
        metadata: {
          courseId: task.courseId,
          courseName: task.course.name,
          subjectId: task.subjectId,
          subjectName: task.subject.name,
          ...(studentName ? { studentName } : {}),
        },
      };
    });
  }

  private async getCommunicationEvents(
    institutionId: string,
    userContext: { role: string; studentIds: string[]; courseIds: string[] },
    startDate: Date,
    endDate: Date,
    userId: string,
  ): Promise<AgendaEventDto[]> {
    const where: Prisma.CommunicationWhereInput = {
      institutionId,
      status: 'PUBLISHED',
      publishedAt: {
        not: null,
        gte: startDate,
        lte: endDate,
      },
    };

    if (userContext.role === 'student' || userContext.role === 'parent') {
      const userIds = await this.getUserIdsForStudents(institutionId, userContext.studentIds);
      if (userIds.length === 0) return [];

      where.recipients = {
        some: {
          userId: { in: userIds },
        },
      };
    } else if (userContext.role === 'teacher') {
      const teacherUserIds = await this.getTeacherUserIds(userId);
      if (teacherUserIds.length > 0) {
        where.recipients = {
          some: {
            userId: { in: teacherUserIds },
          },
        };
      } else {
        where.OR = [{ audience: 'ALL' }, { audience: 'TEACHERS' }];
      }
    }

    const comms = await this.prisma.communication.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        audience: true,
        status: true,
        publishedAt: true,
      },
    });

    return comms.map((comm) => ({
      id: `comm-${comm.id}`,
      type: AgendaEventType.COMMUNICATION,
      title: comm.title,
      description: comm.content.substring(0, 200),
      start: (comm.publishedAt ?? new Date()).toISOString(),
      allDay: true,
      status: comm.status,
      sourceId: comm.id,
      sourceType: 'Communication',
      route: `/communications/${comm.id}`,
      metadata: {
        audience: comm.audience,
      },
    }));
  }

  private async getSignatureEvents(
    institutionId: string,
    userContext: { role: string; studentIds: string[]; courseIds: string[] },
    startDate: Date,
    endDate: Date,
  ): Promise<AgendaEventDto[]> {
    const where: Prisma.SignatureRequestWhereInput = {
      institutionId,
      status: 'PUBLISHED',
    };

    if (userContext.role === 'student' || userContext.role === 'parent') {
      const userIds = await this.getUserIdsForStudents(institutionId, userContext.studentIds);
      if (userIds.length === 0) return [];

      where.recipients = {
        some: {
          userId: { in: userIds },
          status: 'PENDING',
        },
      };
    } else if (userContext.role === 'teacher') {
      where.recipients = {
        some: {
          status: 'PENDING',
        },
      };
    }

    const sigs = await this.prisma.signatureRequest.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
      },
    });

    return sigs
      .filter((sig) => {
        const date = sig.dueDate;
        if (!date) return true;
        return date >= startDate && date <= endDate;
      })
      .map((sig) => ({
        id: `sig-${sig.id}`,
        type: AgendaEventType.SIGNATURE,
        title: sig.title,
        description: sig.description ?? undefined,
        start: (sig.dueDate ?? new Date()).toISOString(),
        allDay: true,
        status: sig.status,
        sourceId: sig.id,
        sourceType: 'SignatureRequest',
        route: `/signatures/${sig.id}`,
        metadata: {},
      }));
  }

  private async getAgendaEventItems(
    institutionId: string,
    userContext: {
      role: string;
      studentIds: string[];
      courseIds: string[];
      studentNames?: Record<string, string>;
    },
    startDate: Date,
    endDate: Date,
    userId: string,
  ): Promise<AgendaEventDto[]> {
    const where: Prisma.AgendaEventWhereInput = {
      institutionId,
      status: 'ACTIVE',
      startAt: { lte: endDate },
      endAt: { gte: startDate },
    };

    if (userContext.role === 'teacher') {
      where.OR = [
        { audience: { in: [CommunicationAudience.ALL, CommunicationAudience.TEACHERS] } },
        { createdById: userId },
      ];
    } else if (userContext.role === 'parent') {
      where.audience = { in: [CommunicationAudience.ALL, CommunicationAudience.PARENTS] };
    } else if (userContext.role === 'student') {
      where.audience = { in: [CommunicationAudience.ALL, CommunicationAudience.STUDENTS] };
    }

    const events = await this.prisma.agendaEvent.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        startAt: true,
        endAt: true,
        location: true,
        audience: true,
        status: true,
      },
      orderBy: { startAt: 'asc' },
    });

    return events.map((event) => ({
      id: `event-${event.id}`,
      type: AgendaEventType.EVENT,
      title: event.title,
      description: event.description ?? undefined,
      start: event.startAt.toISOString(),
      end: event.endAt.toISOString(),
      allDay: false,
      status: event.status,
      sourceId: event.id,
      sourceType: 'AgendaEvent',
      route: `/agenda/events/${event.id}`,
      metadata: {
        audience: event.audience,
        location: event.location ?? undefined,
      },
    }));
  }

  private async getTeacherUserIds(teacherUserId: string): Promise<string[]> {
    return [teacherUserId];
  }

  private async getStudentCourseIds(
    institutionId: string,
    studentIds: string[],
  ): Promise<string[]> {
    if (studentIds.length === 0) return [];
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId: { in: studentIds },
        institutionId,
        status: 'ACTIVE',
      },
      select: { courseId: true },
    });
    return [...new Set(enrollments.map((e) => e.courseId))];
  }

  private async getUserIdsForStudents(
    institutionId: string,
    studentIds: string[],
  ): Promise<string[]> {
    if (studentIds.length === 0) return [];

    const guardianLinks = await this.prisma.guardianStudent.findMany({
      where: {
        studentId: { in: studentIds },
        status: 'ACTIVE',
      },
      select: { guardianUserId: true },
    });
    const guardianUserIds = guardianLinks.map((gl) => gl.guardianUserId);

    const students = await this.prisma.student.findMany({
      where: {
        id: { in: studentIds },
        institutionId,
      },
      select: { id: true },
    });

    return [...new Set([...guardianUserIds, ...students.map((s) => s.id)])];
  }

  private parseTime(time: unknown): { hours: number; minutes: number } | null {
    if (time === null || time === undefined) {
      return null;
    }

    if (time instanceof Date) {
      if (isNaN(time.getTime())) {
        return null;
      }
      return { hours: time.getHours(), minutes: time.getMinutes() };
    }

    const timeStr = String(time);
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0] ?? '', 10);
    const minutes = parseInt(parts[1] ?? '', 10);

    if (isNaN(hours) || isNaN(minutes)) {
      return null;
    }

    return { hours, minutes };
  }

  private findStudentNameForCourse(
    courseId: string,
    studentIds: string[],
    studentNames: Record<string, string>,
  ): string | undefined {
    for (const sid of studentIds) {
      if (studentNames[sid]) return studentNames[sid];
    }
    return undefined;
  }
}
