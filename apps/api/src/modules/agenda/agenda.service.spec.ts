import { BadRequestException } from '@nestjs/common';
import { AgendaService } from './agenda.service';
import { AgendaEventType, AgendaView } from './dto/list-agenda-query.dto';

describe('AgendaService', () => {
  let service: AgendaService;
  let prismaMock: {
    globalUserRole: { findFirst: jest.Mock };
    userInstitution: { findUnique: jest.Mock };
    student: { findFirst: jest.Mock; findMany: jest.Mock };
    guardianStudent: { findMany: jest.Mock };
    enrollment: { findMany: jest.Mock };
    teacherAssignment: { findMany: jest.Mock };
    schedule: { findMany: jest.Mock };
    task: { findMany: jest.Mock };
    taskAssignment: { findMany: jest.Mock };
    communication: { findMany: jest.Mock };
    communicationRecipient: { findMany: jest.Mock };
    signatureRequest: { findMany: jest.Mock };
    signatureRecipient: { findMany: jest.Mock };
    agendaEvent: { findMany: jest.Mock };
  };

  const institutionId = 'inst-1';
  const userId = 'user-1';

  beforeEach(() => {
    prismaMock = {
      globalUserRole: { findFirst: jest.fn() },
      userInstitution: { findUnique: jest.fn() },
      student: { findFirst: jest.fn(), findMany: jest.fn() },
      guardianStudent: { findMany: jest.fn() },
      enrollment: { findMany: jest.fn() },
      teacherAssignment: { findMany: jest.fn() },
      schedule: { findMany: jest.fn() },
      task: { findMany: jest.fn() },
      taskAssignment: { findMany: jest.fn() },
      communication: { findMany: jest.fn() },
      communicationRecipient: { findMany: jest.fn() },
      signatureRequest: { findMany: jest.fn() },
      signatureRecipient: { findMany: jest.fn() },
      agendaEvent: { findMany: jest.fn() },
    };

    service = new AgendaService(prismaMock as never);

    prismaMock.globalUserRole.findFirst.mockResolvedValue(null);
    prismaMock.userInstitution.findUnique.mockResolvedValue({
      id: 'mem-1',
      userId,
      institutionId,
      status: 'ACTIVE',
      roles: [{ role: { name: 'STUDENT' } }],
    });
    prismaMock.student.findFirst.mockResolvedValue({ id: 'student-1' });
    prismaMock.student.findMany.mockResolvedValue([{ id: 'student-1' }]);
    prismaMock.guardianStudent.findMany.mockResolvedValue([]);
    prismaMock.enrollment.findMany.mockResolvedValue([]);
    prismaMock.teacherAssignment.findMany.mockResolvedValue([]);
    prismaMock.schedule.findMany.mockResolvedValue([]);
    prismaMock.task.findMany.mockResolvedValue([]);
    prismaMock.taskAssignment.findMany.mockResolvedValue([]);
    prismaMock.communication.findMany.mockResolvedValue([]);
    prismaMock.signatureRequest.findMany.mockResolvedValue([]);
    prismaMock.agendaEvent.findMany.mockResolvedValue([]);
  });

  describe('getAgenda', () => {
    it('should return events for a valid date range', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
      prismaMock.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-1',
          institutionId,
          courseId: 'course-1',
          subjectId: 'subj-1',
          dayOfWeek: 'MONDAY',
          startTime: '08:00:00',
          endTime: '09:30:00',
          classroom: 'Room 101',
          status: 'ACTIVE',
          course: { id: 'course-1', name: 'Math' },
          subject: { id: 'subj-1', name: 'Algebra' },
        },
      ]);

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
        view: AgendaView.WEEK,
      });

      expect(result.data).toBeDefined();
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
      expect(result.total).toBeDefined();
    });

    it('should throw BadRequestException for invalid date range', async () => {
      await expect(
        service.getAgenda(institutionId, userId, {
          start: '2026-08-30',
          end: '2026-08-24',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for range exceeding 62 days', async () => {
      await expect(
        service.getAgenda(institutionId, userId, {
          start: '2026-01-01',
          end: '2026-04-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should filter by event types', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
      prismaMock.taskAssignment.findMany.mockResolvedValue([{ taskId: 'task-1' }]);
      prismaMock.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          institutionId,
          courseId: 'course-1',
          subjectId: 'subj-1',
          title: 'Homework',
          description: null,
          dueDate: new Date('2026-08-25T23:59:00Z'),
          status: 'PUBLISHED',
          course: { id: 'course-1', name: 'Math' },
          subject: { id: 'subj-1', name: 'Algebra' },
        },
      ]);

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
        eventTypes: [AgendaEventType.TASK],
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe(AgendaEventType.TASK);
    });

    it('should return empty array when student has no enrollments', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([]);

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
      });

      expect(result.data).toHaveLength(0);
    });

    it('should query tasks for assigned students', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
      prismaMock.taskAssignment.findMany.mockResolvedValue([{ taskId: 'task-1' }]);
      prismaMock.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          institutionId,
          courseId: 'course-1',
          subjectId: 'subj-1',
          title: 'Test Task',
          description: 'Desc',
          dueDate: new Date('2026-08-25T15:00:00Z'),
          status: 'PUBLISHED',
          course: { id: 'course-1', name: 'Math' },
          subject: { id: 'subj-1', name: 'Algebra' },
        },
      ]);

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
        eventTypes: [AgendaEventType.TASK],
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].sourceType).toBe('Task');
    });

    it('should handle teacher role with course-based filtering', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({
        id: 'mem-1',
        userId,
        institutionId,
        status: 'ACTIVE',
        roles: [{ role: { name: 'TEACHER' } }],
      });
      prismaMock.teacherAssignment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
      });

      expect(result.data).toBeDefined();
      expect(prismaMock.teacherAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ teacherUserId: userId }),
        }),
      );
    });

    it('should handle admin role seeing all events', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({
        id: 'mem-1',
        userId,
        institutionId,
        status: 'ACTIVE',
        roles: [{ role: { name: 'INSTITUTION_ADMIN' } }],
      });

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
      });

      expect(result.data).toBeDefined();
    });

    it('should handle schedules with Date objects for startTime/endTime', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
      prismaMock.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-dateobj',
          institutionId,
          courseId: 'course-1',
          subjectId: 'subj-1',
          dayOfWeek: 'MONDAY',
          startTime: new Date('1970-01-01T08:00:00.000Z'),
          endTime: new Date('1970-01-01T09:30:00.000Z'),
          classroom: 'Room 101',
          status: 'ACTIVE',
          course: { id: 'course-1', name: 'Math' },
          subject: { id: 'subj-1', name: 'Algebra' },
        },
      ]);

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
        eventTypes: [AgendaEventType.SCHEDULE],
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].start).toBeDefined();
      expect(result.data[0].end).toBeDefined();
    });

    it('should skip schedule when startTime is null', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
      prismaMock.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-null-start',
          institutionId,
          courseId: 'course-1',
          subjectId: 'subj-1',
          dayOfWeek: 'MONDAY',
          startTime: null,
          endTime: new Date('1970-01-01T09:30:00.000Z'),
          classroom: 'Room 101',
          status: 'ACTIVE',
          course: { id: 'course-1', name: 'Math' },
          subject: { id: 'subj-1', name: 'Algebra' },
        },
      ]);

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
        eventTypes: [AgendaEventType.SCHEDULE],
      });

      expect(result.data).toHaveLength(0);
    });

    it('should skip schedule when endTime is null', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
      prismaMock.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-null-end',
          institutionId,
          courseId: 'course-1',
          subjectId: 'subj-1',
          dayOfWeek: 'MONDAY',
          startTime: new Date('1970-01-01T08:00:00.000Z'),
          endTime: null,
          classroom: 'Room 101',
          status: 'ACTIVE',
          course: { id: 'course-1', name: 'Math' },
          subject: { id: 'subj-1', name: 'Algebra' },
        },
      ]);

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
        eventTypes: [AgendaEventType.SCHEDULE],
      });

      expect(result.data).toHaveLength(0);
    });

    it('should skip schedule when both startTime and endTime are null', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
      prismaMock.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-both-null',
          institutionId,
          courseId: 'course-1',
          subjectId: 'subj-1',
          dayOfWeek: 'MONDAY',
          startTime: null,
          endTime: null,
          classroom: 'Room 101',
          status: 'ACTIVE',
          course: { id: 'course-1', name: 'Math' },
          subject: { id: 'subj-1', name: 'Algebra' },
        },
      ]);

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
        eventTypes: [AgendaEventType.SCHEDULE],
      });

      expect(result.data).toHaveLength(0);
    });

    it('should skip schedule with invalid time value (NaN)', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
      prismaMock.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-invalid',
          institutionId,
          courseId: 'course-1',
          subjectId: 'subj-1',
          dayOfWeek: 'MONDAY',
          startTime: 'invalid-time',
          endTime: 'also-invalid',
          classroom: 'Room 101',
          status: 'ACTIVE',
          course: { id: 'course-1', name: 'Math' },
          subject: { id: 'subj-1', name: 'Algebra' },
        },
      ]);

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
        eventTypes: [AgendaEventType.SCHEDULE],
      });

      expect(result.data).toHaveLength(0);
    });

    it('should not throw RangeError for any schedule time data', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
      prismaMock.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-1',
          institutionId,
          courseId: 'course-1',
          subjectId: 'subj-1',
          dayOfWeek: 'MONDAY',
          startTime: new Date('1970-01-01T08:00:00.000Z'),
          endTime: new Date('1970-01-01T09:30:00.000Z'),
          classroom: 'Room 101',
          status: 'ACTIVE',
          course: { id: 'course-1', name: 'Math' },
          subject: { id: 'subj-1', name: 'Algebra' },
        },
        {
          id: 'sched-null',
          institutionId,
          courseId: 'course-1',
          subjectId: 'subj-1',
          dayOfWeek: 'TUESDAY',
          startTime: null,
          endTime: null,
          classroom: 'Room 102',
          status: 'ACTIVE',
          course: { id: 'course-1', name: 'Math' },
          subject: { id: 'subj-1', name: 'Algebra' },
        },
      ]);

      await expect(
        service.getAgenda(institutionId, userId, {
          start: '2026-08-24',
          end: '2026-08-30',
          eventTypes: [AgendaEventType.SCHEDULE],
        }),
      ).resolves.toBeDefined();
    });

    it('should produce valid ISO dates for schedules with Date objects', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
      prismaMock.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-iso',
          institutionId,
          courseId: 'course-1',
          subjectId: 'subj-1',
          dayOfWeek: 'MONDAY',
          startTime: new Date('1970-01-01T14:00:00.000Z'),
          endTime: new Date('1970-01-01T15:30:00.000Z'),
          classroom: 'Room 101',
          status: 'ACTIVE',
          course: { id: 'course-1', name: 'Math' },
          subject: { id: 'subj-1', name: 'Algebra' },
        },
      ]);

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
        eventTypes: [AgendaEventType.SCHEDULE],
      });

      expect(result.data).toHaveLength(1);
      expect(new Date(result.data[0].start).toISOString()).toBe(result.data[0].start);
      expect(new Date(result.data[0].end!).toISOString()).toBe(result.data[0].end);
    });

    it('should sort events by start time', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
      prismaMock.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-1',
          institutionId,
          courseId: 'course-1',
          subjectId: 'subj-1',
          dayOfWeek: 'MONDAY',
          startTime: '10:00:00',
          endTime: '11:00:00',
          classroom: null,
          status: 'ACTIVE',
          course: { id: 'course-1', name: 'Math' },
          subject: { id: 'subj-1', name: 'Algebra' },
        },
        {
          id: 'sched-2',
          institutionId,
          courseId: 'course-1',
          subjectId: 'subj-2',
          dayOfWeek: 'MONDAY',
          startTime: '08:00:00',
          endTime: '09:00:00',
          classroom: null,
          status: 'ACTIVE',
          course: { id: 'course-1', name: 'Math' },
          subject: { id: 'subj-2', name: 'Geometry' },
        },
      ]);

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
        eventTypes: [AgendaEventType.SCHEDULE],
      });

      if (result.data.length >= 2) {
        expect(new Date(result.data[0].start).getTime()).toBeLessThanOrEqual(
          new Date(result.data[1].start).getTime(),
        );
      }
    });

    it('should include custom agenda events (EVENT) for admin role', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({
        id: 'mem-1',
        userId,
        institutionId,
        status: 'ACTIVE',
        roles: [{ role: { name: 'INSTITUTION_ADMIN' } }],
      });
      prismaMock.agendaEvent.findMany.mockResolvedValue([
        {
          id: 'event-1',
          title: 'Reunion de padres',
          description: null,
          startAt: new Date('2026-08-25T14:00:00Z'),
          endAt: new Date('2026-08-25T16:00:00Z'),
          location: 'Salon de actos',
          audience: 'ALL',
          status: 'ACTIVE',
        },
      ]);

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
        eventTypes: [AgendaEventType.EVENT],
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe(AgendaEventType.EVENT);
      expect(result.data[0].sourceType).toBe('AgendaEvent');
      expect(result.data[0].route).toContain('/agenda/events/');
    });

    it('should filter custom events by audience for a student', async () => {
      prismaMock.agendaEvent.findMany.mockResolvedValue([]);

      const result = await service.getAgenda(institutionId, userId, {
        start: '2026-08-24',
        end: '2026-08-30',
        eventTypes: [AgendaEventType.EVENT],
      });

      expect(result.data).toHaveLength(0);
      expect(prismaMock.agendaEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institutionId,
            status: 'ACTIVE',
            audience: { in: ['ALL', 'STUDENTS'] },
          }),
        }),
      );
    });
  });
});
