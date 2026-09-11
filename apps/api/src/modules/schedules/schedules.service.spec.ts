import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { ScheduleExportFormat } from './dto/schedule-export-query.dto';
import { ScheduleStatus, DayOfWeek } from '@prisma/client';
import {
  resolveAccessibleCourseIds,
  resolveAccessibleStudentIds,
} from '../../common/auth/academic-scope';

jest.mock('../../common/auth/academic-scope', () => ({
  resolveAccessibleCourseIds: jest.fn(),
  resolveAccessibleStudentIds: jest.fn(),
  getUserRoleNames: jest.fn(),
  hasFullAccess: jest.fn(),
  FULL_ACCESS_ROLES: new Set(),
  TEACHER_SCOPED_ROLES: new Set(),
}));

const mockedResolveCourses = jest.mocked(resolveAccessibleCourseIds);
const mockedResolveStudents = jest.mocked(resolveAccessibleStudentIds);

describe('SchedulesService', () => {
  let service: SchedulesService;
  let prismaMock: {
    course: { findFirst: jest.Mock; findMany: jest.Mock };
    subject: { findFirst: jest.Mock; findMany: jest.Mock };
    academicPeriod: { findFirst: jest.Mock };
    teacherAssignment: { findFirst: jest.Mock };
    classroom: { findFirst: jest.Mock; findMany: jest.Mock };
    user: { findMany: jest.Mock };
    institution: { findUnique: jest.Mock };
    enrollment: { findMany: jest.Mock };
    scheduleBlock: { findFirst: jest.Mock };
    schedule: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditServiceMock: { log: jest.Mock };

  const institutionId = 'inst-1';
  const userId = 'user-1';
  const courseId = 'course-1';
  const subjectId = 'subject-1';
  const academicPeriodId = 'period-1';
  const teacherUserId = 'teacher-1';
  const classroomId = 'classroom-1';
  const blockId = 'block-1';

  beforeEach(() => {
    prismaMock = {
      course: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      subject: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      academicPeriod: { findFirst: jest.fn() },
      teacherAssignment: { findFirst: jest.fn() },
      classroom: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      institution: { findUnique: jest.fn().mockResolvedValue({ name: 'Demo' }) },
      enrollment: { findMany: jest.fn().mockResolvedValue([]) },
      scheduleBlock: { findFirst: jest.fn() },
      schedule: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    auditServiceMock = { log: jest.fn() };

    service = new SchedulesService(prismaMock as never, auditServiceMock as never);

    prismaMock.course.findFirst.mockResolvedValue({ id: courseId, institutionId });
    prismaMock.subject.findFirst.mockResolvedValue({
      id: subjectId,
      institutionId,
      name: 'Matemáticas',
    });
    prismaMock.academicPeriod.findFirst.mockResolvedValue({ id: academicPeriodId, institutionId });
    prismaMock.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1', institutionId });
    prismaMock.classroom.findFirst.mockResolvedValue({
      id: classroomId,
      institutionId,
      status: 'ACTIVE',
    });
    prismaMock.scheduleBlock.findFirst.mockResolvedValue({ id: blockId, institutionId });

    mockedResolveCourses.mockReset();
    mockedResolveStudents.mockReset();
    mockedResolveCourses.mockResolvedValue(null);
    mockedResolveStudents.mockResolvedValue(null);
  });

  const baseCreate = (overrides: Record<string, unknown> = {}) => ({
    courseId,
    subjectId,
    academicPeriodId,
    dayOfWeek: DayOfWeek.MONDAY,
    startTime: '08:00',
    endTime: '09:30',
    ...overrides,
  });

  describe('create', () => {
    it('should create a schedule with tenant institutionId', async () => {
      prismaMock.schedule.findFirst.mockResolvedValue(null);
      prismaMock.schedule.create.mockResolvedValue({
        id: 'schedule-1',
        institutionId,
        courseId,
        subjectId,
        academicPeriodId,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '08:00',
        endTime: '09:30',
        status: ScheduleStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(institutionId, baseCreate(), userId);

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.schedule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institutionId, academicPeriodId }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SCHEDULE_CREATED',
          institutionId,
          userId,
        }),
      );
    });

    it('should reject course from another tenant', async () => {
      prismaMock.course.findFirst.mockResolvedValue(null);

      await expect(service.create(institutionId, baseCreate(), userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject subject from another tenant', async () => {
      prismaMock.subject.findFirst.mockResolvedValue(null);

      await expect(service.create(institutionId, baseCreate(), userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject academic period from another tenant', async () => {
      prismaMock.academicPeriod.findFirst.mockResolvedValue(null);

      await expect(service.create(institutionId, baseCreate(), userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject startTime >= endTime', async () => {
      await expect(
        service.create(institutionId, baseCreate({ startTime: '09:30', endTime: '08:00' }), userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject overlapping schedule for same course/day', async () => {
      prismaMock.schedule.findFirst.mockResolvedValue({
        id: 'existing-schedule',
        startTime: '08:00',
        endTime: '09:30',
      });

      await expect(
        service.create(institutionId, baseCreate({ startTime: '09:00', endTime: '10:00' }), userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject teacher without active assignment', async () => {
      prismaMock.schedule.findFirst.mockResolvedValue(null);
      prismaMock.teacherAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.create(institutionId, baseCreate({ teacherUserId }), userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject classroom from another tenant', async () => {
      prismaMock.schedule.findFirst.mockResolvedValue(null);
      prismaMock.classroom.findFirst.mockResolvedValue(null);

      await expect(
        service.create(institutionId, baseCreate({ classroomId }), userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject schedule block from another tenant', async () => {
      prismaMock.schedule.findFirst.mockResolvedValue(null);
      prismaMock.scheduleBlock.findFirst.mockResolvedValue(null);

      await expect(service.create(institutionId, baseCreate({ blockId }), userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should find schedule only in current tenant', async () => {
      prismaMock.schedule.findFirst.mockResolvedValue({
        id: 'schedule-1',
        institutionId,
      });

      const result = await service.findOne(institutionId, 'schedule-1');

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.schedule.findFirst).toHaveBeenCalledWith({
        where: { id: 'schedule-1', institutionId },
      });
    });

    it('should throw NotFoundException for cross-tenant resource', async () => {
      prismaMock.schedule.findFirst.mockResolvedValue(null);

      await expect(service.findOne(institutionId, 'schedule-from-other-tenant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return only current tenant schedules', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([
        { id: 's1', institutionId },
        { id: 's2', institutionId },
      ]);
      prismaMock.schedule.count.mockResolvedValue(2);

      const result = await service.findAll(institutionId, {});

      expect(result.data).toHaveLength(2);
      expect(prismaMock.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
        }),
      );
    });

    it('should apply pagination', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([]);
      prismaMock.schedule.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, { page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(prismaMock.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by courseId within tenant', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([]);
      prismaMock.schedule.count.mockResolvedValue(0);

      await service.findAll(institutionId, { courseId });

      expect(prismaMock.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, courseId }),
        }),
      );
    });

    it('should filter by subjectId within tenant', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([]);
      prismaMock.schedule.count.mockResolvedValue(0);

      await service.findAll(institutionId, { subjectId });

      expect(prismaMock.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, subjectId }),
        }),
      );
    });

    it('should filter by teacherUserId within tenant', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([]);
      prismaMock.schedule.count.mockResolvedValue(0);

      await service.findAll(institutionId, { teacherUserId });

      expect(prismaMock.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, teacherUserId }),
        }),
      );
    });

    it('should filter by dayOfWeek within tenant', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([]);
      prismaMock.schedule.count.mockResolvedValue(0);

      await service.findAll(institutionId, { dayOfWeek: DayOfWeek.MONDAY });

      expect(prismaMock.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, dayOfWeek: DayOfWeek.MONDAY }),
        }),
      );
    });

    it('should filter by status within tenant', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([]);
      prismaMock.schedule.count.mockResolvedValue(0);

      await service.findAll(institutionId, { status: ScheduleStatus.ACTIVE });

      expect(prismaMock.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, status: ScheduleStatus.ACTIVE }),
        }),
      );
    });
  });

  describe('exportSchedules', () => {
    const scopedRow = {
      id: 's1',
      institutionId,
      courseId,
      subjectId,
      classroomId,
      teacherUserId,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: new Date('1970-01-01T08:00:00Z'),
      endTime: new Date('1970-01-01T09:30:00Z'),
      status: ScheduleStatus.ACTIVE,
    };

    function mockScopedData() {
      prismaMock.schedule.findMany.mockResolvedValue([scopedRow]);
      prismaMock.schedule.count.mockResolvedValue(1);
      prismaMock.schedule.findFirst.mockResolvedValue(null);
      prismaMock.course.findMany.mockResolvedValue([{ id: courseId, name: 'Curso 1' }]);
      prismaMock.subject.findMany.mockResolvedValue([{ id: subjectId, name: 'Matemáticas' }]);
      prismaMock.classroom.findMany.mockResolvedValue([{ id: classroomId, name: 'Aula 101' }]);
      prismaMock.user.findMany.mockResolvedValue([
        { id: teacherUserId, firstName: 'Ana', lastName: 'López' },
      ]);
    }

    it('should export scoped schedules as PDF', async () => {
      mockedResolveCourses.mockResolvedValue([courseId]);
      mockScopedData();

      const result = await service.exportSchedules(institutionId, 'parent-1', {});

      expect(result.contentType).toBe('application/pdf');
      expect(result.filename).toMatch(/\.pdf$/);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SCHEDULE_EXPORTED' }),
      );
    });

    it('should export scoped schedules as XLSX', async () => {
      mockedResolveCourses.mockResolvedValue([courseId]);
      mockScopedData();

      const result = await service.exportSchedules(institutionId, 'parent-1', {
        format: ScheduleExportFormat.XLSX,
      });

      expect(result.contentType).toContain('spreadsheetml');
      expect(result.filename).toMatch(/\.xlsx$/);
      expect(result.buffer.subarray(0, 2).toString()).toBe('PK');
    });

    it('should export scoped schedules as CSV', async () => {
      mockedResolveCourses.mockResolvedValue([courseId]);
      mockScopedData();

      const result = await service.exportSchedules(institutionId, 'parent-1', {
        format: ScheduleExportFormat.CSV,
      });

      expect(result.contentType).toContain('text/csv');
      const text = result.buffer.toString('utf8');
      expect(text).toContain('Matemáticas');
    });

    it('should reject a courseId outside the caller scope', async () => {
      mockedResolveCourses.mockResolvedValue([courseId]);

      await expect(
        service.exportSchedules(institutionId, 'parent-1', { courseId: 'other-course' }),
      ).rejects.toThrow(NotFoundException);
      expect(auditServiceMock.log).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const existingSchedule = {
      id: 'schedule-1',
      institutionId,
      courseId,
      subjectId,
      academicPeriodId,
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: new Date('1970-01-01T08:00:00Z'),
      endTime: new Date('1970-01-01T09:30:00Z'),
      status: ScheduleStatus.ACTIVE,
    };

    it('should update schedule only in current tenant', async () => {
      prismaMock.schedule.findFirst
        .mockResolvedValueOnce(existingSchedule)
        .mockResolvedValueOnce(null);
      prismaMock.schedule.update.mockResolvedValue({
        id: 'schedule-1',
        institutionId,
      });

      const result = await service.update(
        institutionId,
        'schedule-1',
        { startTime: '09:00', endTime: '10:00' },
        userId,
      );

      expect(result.id).toBe('schedule-1');
    });

    it('should throw NotFoundException for cross-tenant update', async () => {
      prismaMock.schedule.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'other-tenant-schedule', { startTime: '09:00' }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not allow modifying institutionId', async () => {
      prismaMock.schedule.findFirst
        .mockResolvedValueOnce(existingSchedule)
        .mockResolvedValueOnce(null);
      prismaMock.schedule.update.mockResolvedValue({ id: 'schedule-1', institutionId });

      await service.update(
        institutionId,
        'schedule-1',
        { startTime: '09:00', endTime: '10:00' },
        userId,
      );

      const updateCall = prismaMock.schedule.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('institutionId');
    });

    it('should validate relations when courseId changes', async () => {
      prismaMock.schedule.findFirst
        .mockResolvedValueOnce(existingSchedule)
        .mockResolvedValueOnce(null);
      prismaMock.schedule.update.mockResolvedValue({ id: 'schedule-1', institutionId });

      await service.update(institutionId, 'schedule-1', { courseId: 'new-course' }, userId);

      expect(prismaMock.course.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'new-course', institutionId } }),
      );
    });

    it('should reject startTime >= endTime on update', async () => {
      prismaMock.schedule.findFirst.mockResolvedValue(existingSchedule);

      await expect(
        service.update(
          institutionId,
          'schedule-1',
          { startTime: '10:00', endTime: '09:00' },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivate', () => {
    it('should set status to INACTIVE', async () => {
      prismaMock.schedule.findFirst
        .mockResolvedValueOnce({
          id: 'schedule-1',
          institutionId,
          courseId,
          subjectId,
          academicPeriodId,
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: new Date('1970-01-01T08:00:00Z'),
          endTime: new Date('1970-01-01T09:30:00Z'),
          status: ScheduleStatus.ACTIVE,
        })
        .mockResolvedValueOnce(null);
      prismaMock.schedule.update.mockResolvedValue({
        id: 'schedule-1',
        institutionId,
        status: ScheduleStatus.INACTIVE,
      });

      const result = await service.deactivate(institutionId, 'schedule-1', userId);

      expect(result.status).toBe(ScheduleStatus.INACTIVE);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SCHEDULE_DEACTIVATED',
        }),
      );
    });

    it('should throw NotFoundException for cross-tenant deactivate', async () => {
      prismaMock.schedule.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivate(institutionId, 'other-tenant-schedule', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
