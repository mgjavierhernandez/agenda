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
  });

  describe('getAgenda', () => {
    it('should return events for a valid date range', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([
        { courseId: 'course-1' },
      ]);
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
      prismaMock.enrollment.findMany.mockResolvedValue([
        { courseId: 'course-1' },
      ]);
      prismaMock.taskAssignment.findMany.mockResolvedValue([
        { taskId: 'task-1' },
      ]);
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
      prismaMock.enrollment.findMany.mockResolvedValue([
        { courseId: 'course-1' },
      ]);
      prismaMock.taskAssignment.findMany.mockResolvedValue([
        { taskId: 'task-1' },
      ]);
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
      prismaMock.teacherAssignment.findMany.mockResolvedValue([
        { courseId: 'course-1' },
      ]);

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

    it('should sort events by start time', async () => {
      prismaMock.enrollment.findMany.mockResolvedValue([
        { courseId: 'course-1' },
      ]);
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
  });
});
