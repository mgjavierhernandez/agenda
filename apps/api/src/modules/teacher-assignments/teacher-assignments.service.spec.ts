import { Test, TestingModule } from '@nestjs/testing';
import { TeacherAssignmentsService } from './teacher-assignments.service';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TeacherAssignmentStatus, CourseDirectorStatus } from '@prisma/client';

describe('TeacherAssignmentsService', () => {
  let service: TeacherAssignmentsService;
  let prisma: {
    teacherAssignment: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    userInstitution: { findFirst: jest.Mock };
    course: { findFirst: jest.Mock };
    subject: { findFirst: jest.Mock };
    academicPeriod: { findFirst: jest.Mock };
    courseDirectorAssignment: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    schedule: { findMany: jest.Mock; updateMany: jest.Mock };
    auditLog: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let auditService: { log: jest.Mock };

  const mockInstitutionId = 'inst-1';
  const mockUserId = 'user-1';
  const mockIp = '127.0.0.1';

  beforeEach(async () => {
    prisma = {
      teacherAssignment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userInstitution: { findFirst: jest.fn() },
      course: { findFirst: jest.fn() },
      subject: { findFirst: jest.fn() },
      academicPeriod: { findFirst: jest.fn() },
      courseDirectorAssignment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      schedule: { findMany: jest.fn(), updateMany: jest.fn() },
      auditLog: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma));
    prisma.schedule.findMany.mockResolvedValue([]);
    prisma.schedule.updateMany.mockResolvedValue({ count: 0 });
    prisma.auditLog.findMany.mockResolvedValue([]);
    auditService = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherAssignmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<TeacherAssignmentsService>(TeacherAssignmentsService);
  });

  const dto = {
    teacherUserId: 'teacher-1',
    courseId: 'course-1',
    subjectId: 'subject-1',
    academicPeriodId: 'period-1',
  };

  describe('create', () => {
    it('should create a teacher assignment successfully', async () => {
      prisma.userInstitution.findFirst.mockResolvedValue({ id: 'ui-1' });
      prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
      prisma.subject.findFirst.mockResolvedValue({ id: 'subject-1' });
      prisma.academicPeriod.findFirst.mockResolvedValue({ id: 'period-1' });
      prisma.teacherAssignment.findUnique.mockResolvedValue(null);
      prisma.teacherAssignment.findMany.mockResolvedValue([]);
      prisma.teacherAssignment.create.mockResolvedValue({
        id: 'ta-1',
        ...dto,
        institutionId: mockInstitutionId,
        status: TeacherAssignmentStatus.ACTIVE,
      });

      const result = await service.create(mockInstitutionId, dto, mockUserId, mockIp);

      expect(result.id).toBe('ta-1');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TEACHER_ASSIGNMENT_CREATED' }),
      );
    });

    it('should throw ForbiddenException if teacher not in tenant', async () => {
      prisma.userInstitution.findFirst.mockResolvedValue(null);

      await expect(service.create(mockInstitutionId, dto, mockUserId, mockIp)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if course not found', async () => {
      prisma.userInstitution.findFirst.mockResolvedValue({ id: 'ui-1' });
      prisma.course.findFirst.mockResolvedValue(null);

      await expect(service.create(mockInstitutionId, dto, mockUserId, mockIp)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if subject not found', async () => {
      prisma.userInstitution.findFirst.mockResolvedValue({ id: 'ui-1' });
      prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(service.create(mockInstitutionId, dto, mockUserId, mockIp)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if academicPeriod not found', async () => {
      prisma.userInstitution.findFirst.mockResolvedValue({ id: 'ui-1' });
      prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
      prisma.subject.findFirst.mockResolvedValue({ id: 'subject-1' });
      prisma.academicPeriod.findFirst.mockResolvedValue(null);

      await expect(service.create(mockInstitutionId, dto, mockUserId, mockIp)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for duplicate assignment', async () => {
      prisma.userInstitution.findFirst.mockResolvedValue({ id: 'ui-1' });
      prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
      prisma.subject.findFirst.mockResolvedValue({ id: 'subject-1' });
      prisma.academicPeriod.findFirst.mockResolvedValue({ id: 'period-1' });
      prisma.teacherAssignment.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(mockInstitutionId, dto, mockUserId, mockIp)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject workload exceeding max weekly hours', async () => {
      prisma.userInstitution.findFirst.mockResolvedValue({ id: 'ui-1' });
      prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
      prisma.subject.findFirst.mockResolvedValue({ id: 'subject-1' });
      prisma.academicPeriod.findFirst.mockResolvedValue({ id: 'period-1' });
      prisma.teacherAssignment.findUnique.mockResolvedValue(null);
      prisma.teacherAssignment.findMany.mockResolvedValue([
        { weeklyHours: 20 },
        { weeklyHours: 5 },
      ]);

      await expect(
        service.create(
          mockInstitutionId,
          { ...dto, weeklyHours: 3, maxWeeklyHours: 26 },
          mockUserId,
          mockIp,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a teacher assignment', async () => {
      prisma.teacherAssignment.findFirst.mockResolvedValue({
        id: 'ta-1',
        institutionId: mockInstitutionId,
      });

      const result = await service.findOne(mockInstitutionId, 'ta-1');
      expect(result.id).toBe('ta-1');
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.teacherAssignment.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockInstitutionId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for cross-tenant access', async () => {
      prisma.teacherAssignment.findFirst.mockResolvedValue(null);

      await expect(service.findOne('other-tenant', 'ta-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated results scoped to tenant', async () => {
      prisma.teacherAssignment.findMany.mockResolvedValue([{ id: 'ta-1' }]);
      prisma.teacherAssignment.count.mockResolvedValue(1);

      const result = await service.findAll(mockInstitutionId, {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should filter by teacherUserId', async () => {
      prisma.teacherAssignment.findMany.mockResolvedValue([]);
      prisma.teacherAssignment.count.mockResolvedValue(0);

      await service.findAll(mockInstitutionId, { teacherUserId: 'teacher-1' });

      expect(prisma.teacherAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ teacherUserId: 'teacher-1' }),
        }),
      );
    });

    it('should filter by courseId', async () => {
      prisma.teacherAssignment.findMany.mockResolvedValue([]);
      prisma.teacherAssignment.count.mockResolvedValue(0);

      await service.findAll(mockInstitutionId, { courseId: 'course-1' });

      expect(prisma.teacherAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ courseId: 'course-1' }),
        }),
      );
    });

    it('should filter by subjectId', async () => {
      prisma.teacherAssignment.findMany.mockResolvedValue([]);
      prisma.teacherAssignment.count.mockResolvedValue(0);

      await service.findAll(mockInstitutionId, { subjectId: 'subject-1' });

      expect(prisma.teacherAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ subjectId: 'subject-1' }),
        }),
      );
    });

    it('should filter by academicPeriodId', async () => {
      prisma.teacherAssignment.findMany.mockResolvedValue([]);
      prisma.teacherAssignment.count.mockResolvedValue(0);

      await service.findAll(mockInstitutionId, { academicPeriodId: 'period-1' });

      expect(prisma.teacherAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ academicPeriodId: 'period-1' }),
        }),
      );
    });

    it('should respect pagination params', async () => {
      prisma.teacherAssignment.findMany.mockResolvedValue([]);
      prisma.teacherAssignment.count.mockResolvedValue(0);

      await service.findAll(mockInstitutionId, { page: 2, limit: 5 });

      expect(prisma.teacherAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });
  });

  describe('update', () => {
    it('should update the status', async () => {
      prisma.teacherAssignment.findFirst.mockResolvedValue({
        id: 'ta-1',
        institutionId: mockInstitutionId,
        status: TeacherAssignmentStatus.ACTIVE,
      });
      prisma.teacherAssignment.update.mockResolvedValue({
        id: 'ta-1',
        status: TeacherAssignmentStatus.INACTIVE,
      });

      const result = await service.update(
        mockInstitutionId,
        'ta-1',
        { status: TeacherAssignmentStatus.INACTIVE },
        mockUserId,
        mockIp,
      );

      expect(result.status).toBe(TeacherAssignmentStatus.INACTIVE);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TEACHER_ASSIGNMENT_UPDATED' }),
      );
    });

    it('should throw NotFoundException if assignment not found', async () => {
      prisma.teacherAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.update(
          mockInstitutionId,
          'nonexistent',
          { status: TeacherAssignmentStatus.INACTIVE },
          mockUserId,
          mockIp,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should set status to INACTIVE', async () => {
      prisma.teacherAssignment.findFirst.mockResolvedValue({
        id: 'ta-1',
        institutionId: mockInstitutionId,
        status: TeacherAssignmentStatus.ACTIVE,
      });
      prisma.teacherAssignment.update.mockResolvedValue({
        id: 'ta-1',
        status: TeacherAssignmentStatus.INACTIVE,
      });

      const result = await service.deactivate(mockInstitutionId, 'ta-1', mockUserId, mockIp);

      expect(result.status).toBe(TeacherAssignmentStatus.INACTIVE);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TEACHER_ASSIGNMENT_DEACTIVATED' }),
      );
    });
  });

  describe('teacher backfill on assignment create (GAP-7)', () => {
    function mockAssignmentInfra() {
      prisma.userInstitution.findFirst.mockResolvedValue({ id: 'ui-1' });
      prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
      prisma.subject.findFirst.mockResolvedValue({ id: 'subject-1' });
      prisma.academicPeriod.findFirst.mockResolvedValue({ id: 'period-1' });
      prisma.teacherAssignment.findUnique.mockResolvedValue(null);
      prisma.teacherAssignment.findMany.mockResolvedValue([]);
      prisma.teacherAssignment.create.mockResolvedValue({ id: 'ta-1' });
    }

    const slot = (id: string, day = 'MONDAY', start = '08:00', end = '09:00') => ({
      id,
      dayOfWeek: day,
      startTime: new Date(`1970-01-01T${start}:00`),
      endTime: new Date(`1970-01-01T${end}:00`),
    });

    it('should assign the teacher to pending schedules of the same course/subject/period', async () => {
      mockAssignmentInfra();
      prisma.schedule.findMany
        .mockResolvedValueOnce([slot('sched-pending')]) // pending slots
        .mockResolvedValueOnce([]); // teacher load: empty
      prisma.schedule.updateMany.mockResolvedValue({ count: 1 });

      await service.create(mockInstitutionId, dto, mockUserId, mockIp);

      expect(prisma.schedule.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: ['sched-pending'] } }),
          data: expect.objectContaining({ teacherUserId: 'teacher-1' }),
        }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SCHEDULE_TEACHER_BACKFILLED' }),
      );
    });

    it('should not modify schedules that already have a teacher', async () => {
      mockAssignmentInfra();
      // backfill query only returns teacherUserId=null rows by construction
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.schedule.updateMany.mockResolvedValue({ count: 0 });

      await service.create(mockInstitutionId, dto, mockUserId, mockIp);

      const backfillCall = prisma.schedule.findMany.mock.calls.find(
        (args) => args[0]?.where?.teacherUserId === null,
      );
      expect(backfillCall).toBeDefined();
      expect(prisma.schedule.updateMany).not.toHaveBeenCalled();
    });

    it('should update multiple pending schedules at once', async () => {
      mockAssignmentInfra();
      prisma.schedule.findMany
        .mockResolvedValueOnce([slot('s-1'), slot('s-2', 'TUESDAY'), slot('s-3', 'WEDNESDAY')])
        .mockResolvedValueOnce([]);
      prisma.schedule.updateMany.mockResolvedValue({ count: 3 });

      await service.create(mockInstitutionId, dto, mockUserId, mockIp);

      expect(prisma.schedule.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: ['s-1', 's-2', 's-3'] } }),
        }),
      );
    });

    it('should skip pending schedules conflicting with the teacher load', async () => {
      mockAssignmentInfra();
      prisma.schedule.findMany
        .mockResolvedValueOnce([
          slot('s-ok', 'TUESDAY', '08:00', '09:00'),
          slot('s-clash', 'MONDAY', '08:30', '09:30'),
        ])
        .mockResolvedValueOnce([slot('t-busy', 'MONDAY', '08:00', '09:00')]); // teacher busy same slot
      prisma.schedule.updateMany.mockResolvedValue({ count: 1 });

      await service.create(mockInstitutionId, dto, mockUserId, mockIp);

      expect(prisma.schedule.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { in: ['s-ok'] } }) }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SCHEDULE_TEACHER_BACKFILLED',
          newValues: expect.objectContaining({ updated: 1, skipped: 1 }),
        }),
      );
    });
  });

  describe('course director replacement (GAP-8)', () => {
    const directorDto = {
      directorUserId: 'director-A',
      courseId: 'course-1',
      academicPeriodId: 'period-1',
      startDate: '2026-01-01',
    };

    function mockDirectorInfra() {
      prisma.userInstitution.findFirst.mockResolvedValue({ userId: 'director' });
      prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
      prisma.academicPeriod.findFirst.mockResolvedValue({ id: 'period-1' });
    }

    it('should create the first director when none is active', async () => {
      mockDirectorInfra();
      prisma.courseDirectorAssignment.findFirst.mockResolvedValue(null);
      prisma.courseDirectorAssignment.create.mockResolvedValue({ id: 'cd-A', status: 'ACTIVE' });

      const result = await service.createCourseDirector(
        mockInstitutionId,
        directorDto,
        mockUserId,
        mockIp,
      );

      expect(result.status).toBe('ACTIVE');
    });

    it('should reject a second ACTIVE director while one is active', async () => {
      mockDirectorInfra();
      prisma.courseDirectorAssignment.findFirst.mockResolvedValue({ id: 'cd-A', status: 'ACTIVE' });

      await expect(
        service.createCourseDirector(
          mockInstitutionId,
          { ...directorDto, directorUserId: 'director-B' },
          mockUserId,
          mockIp,
        ),
      ).rejects.toThrow(ConflictException);
      expect(prisma.courseDirectorAssignment.create).not.toHaveBeenCalled();
    });

    it('should support double replacement (A->B->C) keeping history without P2002', async () => {
      mockDirectorInfra();

      // Step 1: create A (no active director)
      prisma.courseDirectorAssignment.findFirst.mockResolvedValue(null);
      prisma.courseDirectorAssignment.create.mockResolvedValue({ id: 'cd-A', status: 'ACTIVE' });
      await service.createCourseDirector(mockInstitutionId, directorDto, mockUserId, mockIp);

      // Step 2: deactivate A, create B
      prisma.courseDirectorAssignment.findFirst.mockResolvedValue({
        id: 'cd-A',
        institutionId: mockInstitutionId,
        status: CourseDirectorStatus.ACTIVE,
      });
      prisma.courseDirectorAssignment.update.mockResolvedValue({
        id: 'cd-A',
        status: CourseDirectorStatus.INACTIVE,
      });
      await service.deactivateCourseDirector(mockInstitutionId, 'cd-A', mockUserId, mockIp);

      prisma.courseDirectorAssignment.findFirst.mockResolvedValue(null); // no ACTIVE left
      prisma.courseDirectorAssignment.create.mockResolvedValue({ id: 'cd-B', status: 'ACTIVE' });
      await service.createCourseDirector(
        mockInstitutionId,
        { ...directorDto, directorUserId: 'director-B' },
        mockUserId,
        mockIp,
      );

      // Step 3: deactivate B, create C (second replacement: two INACTIVE rows coexist)
      prisma.courseDirectorAssignment.findFirst.mockResolvedValue({
        id: 'cd-B',
        institutionId: mockInstitutionId,
        status: 'ACTIVE',
      });
      prisma.courseDirectorAssignment.update.mockResolvedValue({ id: 'cd-B', status: 'INACTIVE' });
      await service.deactivateCourseDirector(mockInstitutionId, 'cd-B', mockUserId, mockIp);

      prisma.courseDirectorAssignment.findFirst.mockResolvedValue(null);
      prisma.courseDirectorAssignment.create.mockResolvedValue({ id: 'cd-C', status: 'ACTIVE' });
      const result = await service.createCourseDirector(
        mockInstitutionId,
        { ...directorDto, directorUserId: 'director-C' },
        mockUserId,
        mockIp,
      );

      expect(result.id).toBe('cd-C');
      expect(prisma.courseDirectorAssignment.update).toHaveBeenCalledTimes(2);
      expect(prisma.courseDirectorAssignment.create).toHaveBeenCalledTimes(3);
    });

    it('should reject reactivating an INACTIVE director while another is ACTIVE', async () => {
      prisma.courseDirectorAssignment.findFirst
        .mockResolvedValueOnce({
          // findOneCourseDirector
          id: 'cd-A',
          institutionId: mockInstitutionId,
          courseId: 'course-1',
          academicPeriodId: 'period-1',
          status: 'INACTIVE',
          startDate: new Date('2026-01-01'),
        })
        .mockResolvedValueOnce({ id: 'cd-B', status: 'ACTIVE' }); // other ACTIVE exists

      await expect(
        service.updateCourseDirector(
          mockInstitutionId,
          'cd-A',
          { status: CourseDirectorStatus.ACTIVE },
          mockUserId,
          mockIp,
        ),
      ).rejects.toThrow(ConflictException);
      expect(prisma.courseDirectorAssignment.update).not.toHaveBeenCalled();
    });
  });
});
