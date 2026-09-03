import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { AttendanceStatus } from '@prisma/client';

describe('AttendancesService', () => {
  let service: AttendancesService;
  let prismaMock: {
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
    attendance: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      createMany: jest.Mock;
    };
    student: { findFirst: jest.Mock };
    course: { findFirst: jest.Mock };
    academicPeriod: { findFirst: jest.Mock };
    enrollment: { findFirst: jest.Mock; findMany: jest.Mock };
    teacherAssignment: { findFirst: jest.Mock };
    guardianStudent: { findUnique: jest.Mock };
    globalUserRole: { findFirst: jest.Mock };
  };
  let auditServiceMock: { log: jest.Mock };
  let authzMock: {
    getUserRole: jest.Mock;
    canCreate: jest.Mock;
    canRead: jest.Mock;
    canModify: jest.Mock;
    canDelete: jest.Mock;
    buildListFilter: jest.Mock;
  };

  const institutionId = 'inst-1';
  const userId = 'user-1';
  const studentId = 'student-1';
  const courseId = 'course-1';
  const periodId = 'period-1';
  const dateStr = '2026-08-28';
  const dateObj = new Date('2026-08-28T00:00:00.000Z');

  const baseAttendance = {
    id: 'att-1',
    institutionId,
    studentId,
    courseId,
    academicPeriodId: periodId,
    date: dateObj,
    status: AttendanceStatus.PRESENT,
    notes: null,
    recordedById: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prismaMock = {
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({ ...prismaMock } as never),
      ),
      $queryRaw: jest.fn(),
      attendance: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        createMany: jest.fn(),
      },
      student: { findFirst: jest.fn() },
      course: { findFirst: jest.fn() },
      academicPeriod: { findFirst: jest.fn() },
      enrollment: { findFirst: jest.fn(), findMany: jest.fn() },
      teacherAssignment: { findFirst: jest.fn() },
      guardianStudent: { findUnique: jest.fn() },
      globalUserRole: { findFirst: jest.fn() },
    };

    auditServiceMock = { log: jest.fn() };

    authzMock = {
      getUserRole: jest.fn(),
      canCreate: jest.fn(),
      canRead: jest.fn(),
      canModify: jest.fn(),
      canDelete: jest.fn(),
      buildListFilter: jest.fn(),
    };

    service = new AttendancesService(
      prismaMock as never,
      auditServiceMock as never,
      authzMock as never,
    );

    authzMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
    prismaMock.$queryRaw.mockResolvedValue([{ id: periodId, status: 'ACTIVE' }]);
  });

  const allowAll = () => {
    authzMock.canCreate.mockResolvedValue({ allowed: true });
    authzMock.canRead.mockResolvedValue({ allowed: true });
    authzMock.canModify.mockResolvedValue({ allowed: true });
    authzMock.canDelete.mockResolvedValue({ allowed: true });
  };

  const validCreateDto = {
    studentId,
    courseId,
    academicPeriodId: periodId,
    date: dateStr,
    status: AttendanceStatus.PRESENT,
    notes: null,
  };

  // ============================================================
  // CREATE
  // ============================================================
  describe('create', () => {
    it('should create attendance with server-side institutionId and recordedById', async () => {
      allowAll();
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId, status: 'ACTIVE' });
      prismaMock.course.findFirst.mockResolvedValue({ id: courseId });
      prismaMock.academicPeriod.findFirst.mockResolvedValue({ id: periodId });
      prismaMock.attendance.findUnique.mockResolvedValue(null);
      prismaMock.attendance.create.mockResolvedValue(baseAttendance);

      const result = await service.create(institutionId, validCreateDto, userId, '1.2.3.4');

      expect(prismaMock.attendance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            institutionId,
            recordedById: userId,
            studentId,
            courseId,
            academicPeriodId: periodId,
            status: AttendanceStatus.PRESENT,
          }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ATTENDANCE_CREATED',
          entityType: 'Attendance',
          institutionId,
          userId,
          entityId: 'att-1',
        }),
      );
      expect(result.id).toBe('att-1');
    });

    it('should reject TEACHER not assigned to the course', async () => {
      authzMock.getUserRole.mockResolvedValue('TEACHER');
      authzMock.canCreate.mockResolvedValue({ allowed: false, reason: 'NO_COURSE_RELATIONSHIP' });
      await expect(
        service.create(institutionId, validCreateDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject PARENT attempting to create', async () => {
      authzMock.getUserRole.mockResolvedValue('PARENT');
      authzMock.canCreate.mockResolvedValue({ allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' });
      await expect(
        service.create(institutionId, validCreateDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject STUDENT attempting to create', async () => {
      authzMock.getUserRole.mockResolvedValue('STUDENT');
      authzMock.canCreate.mockResolvedValue({ allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' });
      await expect(
        service.create(institutionId, validCreateDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject SUPER_ADMIN attempting to create', async () => {
      authzMock.getUserRole.mockResolvedValue('SUPER_ADMIN');
      authzMock.canCreate.mockResolvedValue({ allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' });
      await expect(
        service.create(institutionId, validCreateDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFound when student does not belong to the tenant', async () => {
      allowAll();
      prismaMock.student.findFirst.mockResolvedValue(null);
      await expect(
        service.create(institutionId, validCreateDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFound when course does not belong to the tenant', async () => {
      allowAll();
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId });
      prismaMock.course.findFirst.mockResolvedValue(null);
      await expect(
        service.create(institutionId, validCreateDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequest when academic period is CLOSED', async () => {
      allowAll();
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId, status: 'ACTIVE' });
      prismaMock.course.findFirst.mockResolvedValue({ id: courseId });
      prismaMock.academicPeriod.findFirst.mockResolvedValue({ id: periodId });
      prismaMock.$queryRaw.mockResolvedValue([{ id: periodId, status: 'CLOSED' }]);
      await expect(
        service.create(institutionId, validCreateDto, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate attendance for the same student/course/date', async () => {
      allowAll();
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId, status: 'ACTIVE' });
      prismaMock.course.findFirst.mockResolvedValue({ id: courseId });
      prismaMock.academicPeriod.findFirst.mockResolvedValue({ id: periodId });
      prismaMock.attendance.findUnique.mockResolvedValue({ id: 'existing-att' });
      await expect(
        service.create(institutionId, validCreateDto, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // READ (findOne)
  // ============================================================
  describe('findOne', () => {
    it('should return attendance for an authorized user', async () => {
      authzMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authzMock.canRead.mockResolvedValue({ allowed: true });
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      const result = await service.findOne(institutionId, 'att-1', userId);
      expect(result.id).toBe('att-1');
    });

    it('should throw NotFound when attendance belongs to another tenant', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(null);
      await expect(
        service.findOne(institutionId, 'att-1', userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFound for PARENT on unlinked student', async () => {
      authzMock.getUserRole.mockResolvedValue('PARENT');
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.canRead.mockResolvedValue({ allowed: false, reason: 'NO_STUDENT_RELATIONSHIP' });
      await expect(
        service.findOne(institutionId, 'att-1', userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFound for TEACHER on unassigned course', async () => {
      authzMock.getUserRole.mockResolvedValue('TEACHER');
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.canRead.mockResolvedValue({ allowed: false, reason: 'NO_COURSE_RELATIONSHIP' });
      await expect(
        service.findOne(institutionId, 'att-1', userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFound for STUDENT on another student record', async () => {
      authzMock.getUserRole.mockResolvedValue('STUDENT');
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.canRead.mockResolvedValue({ allowed: false, reason: 'NO_STUDENT_RELATIONSHIP' });
      await expect(
        service.findOne(institutionId, 'att-1', userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should deny SUPER_ADMIN access', async () => {
      authzMock.getUserRole.mockResolvedValue('SUPER_ADMIN');
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.canRead.mockResolvedValue({ allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' });
      await expect(
        service.findOne(institutionId, 'att-1', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // LIST (findAll)
  // ============================================================
  describe('findAll', () => {
    it('should filter by tenant and apply role scope', async () => {
      authzMock.getUserRole.mockResolvedValue('TEACHER');
      authzMock.buildListFilter.mockReturnValue({ course: { teacherAssignments: { some: {} } } });
      prismaMock.attendance.findMany.mockResolvedValue([baseAttendance]);
      prismaMock.attendance.count.mockResolvedValue(1);

      const result = await service.findAll(institutionId, { page: 1, limit: 20 }, userId);

      expect(prismaMock.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
        }),
      );
      expect(result.meta.total).toBe(1);
    });

    it('should return empty list for SUPER_ADMIN', async () => {
      authzMock.getUserRole.mockResolvedValue('SUPER_ADMIN');
      const result = await service.findAll(institutionId, { page: 1, limit: 20 }, userId);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should return empty list when no role', async () => {
      authzMock.getUserRole.mockResolvedValue(null);
      const result = await service.findAll(institutionId, { page: 1, limit: 20 }, userId);
      expect(result.data).toEqual([]);
    });
  });

  // ============================================================
  // UPDATE
  // ============================================================
  describe('update', () => {
    it('should update status and notes for an authorized user', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authzMock.canModify.mockResolvedValue({ allowed: true });
      prismaMock.$queryRaw.mockResolvedValue([{ id: periodId, status: 'ACTIVE' }]);
      prismaMock.attendance.update.mockResolvedValue({
        ...baseAttendance,
        status: AttendanceStatus.ABSENT,
        notes: 'Justificado por medico',
      });

      const result = await service.update(
        institutionId,
        'att-1',
        { status: AttendanceStatus.ABSENT, notes: 'Justificado por medico' },
        userId,
        '1.2.3.4',
      );

      expect(prismaMock.attendance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AttendanceStatus.ABSENT,
          }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ATTENDANCE_UPDATED' }),
      );
      expect(result.status).toBe(AttendanceStatus.ABSENT);
    });

    it('should throw NotFound when attendance belongs to another tenant', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(null);
      await expect(
        service.update(institutionId, 'att-1', { status: AttendanceStatus.ABSENT }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject TEACHER on unassigned course', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.getUserRole.mockResolvedValue('TEACHER');
      authzMock.canModify.mockResolvedValue({ allowed: false, reason: 'NO_COURSE_RELATIONSHIP' });
      await expect(
        service.update(institutionId, 'att-1', { status: AttendanceStatus.ABSENT }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject PARENT attempting to update', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.getUserRole.mockResolvedValue('PARENT');
      authzMock.canModify.mockResolvedValue({ allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' });
      await expect(
        service.update(institutionId, 'att-1', { status: AttendanceStatus.ABSENT }, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject SUPER_ADMIN attempting to update', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.getUserRole.mockResolvedValue('SUPER_ADMIN');
      authzMock.canModify.mockResolvedValue({ allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' });
      await expect(
        service.update(institutionId, 'att-1', { status: AttendanceStatus.ABSENT }, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequest in CLOSED period', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authzMock.canModify.mockResolvedValue({ allowed: true });
      prismaMock.$queryRaw.mockResolvedValue([{ id: periodId, status: 'CLOSED' }]);
      await expect(
        service.update(institutionId, 'att-1', { status: AttendanceStatus.ABSENT }, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================
  // DELETE
  // ============================================================
  describe('remove', () => {
    it('should allow ADMIN to delete an attendance record', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authzMock.canDelete.mockResolvedValue({ allowed: true });
      prismaMock.$queryRaw.mockResolvedValue([{ id: periodId, status: 'ACTIVE' }]);
      prismaMock.attendance.delete.mockResolvedValue(baseAttendance);

      const result = await service.remove(institutionId, 'att-1', userId, '1.2.3.4');

      expect(prismaMock.attendance.delete).toHaveBeenCalledWith({ where: { id: 'att-1' } });
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ATTENDANCE_DELETED' }),
      );
      expect(result.success).toBe(true);
    });

    it('should reject TEACHER attempting to delete', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.getUserRole.mockResolvedValue('TEACHER');
      authzMock.canDelete.mockResolvedValue({ allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' });
      await expect(service.remove(institutionId, 'att-1', userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject PARENT attempting to delete', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.getUserRole.mockResolvedValue('PARENT');
      authzMock.canDelete.mockResolvedValue({ allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' });
      await expect(service.remove(institutionId, 'att-1', userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject STUDENT attempting to delete', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.getUserRole.mockResolvedValue('STUDENT');
      authzMock.canDelete.mockResolvedValue({ allowed: false, reason: 'INSUFFICIENT_PERMISSIONS' });
      await expect(service.remove(institutionId, 'att-1', userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject SUPER_ADMIN attempting to delete', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.getUserRole.mockResolvedValue('SUPER_ADMIN');
      authzMock.canDelete.mockResolvedValue({ allowed: false, reason: 'SUPER_ADMIN_NO_ACCESS' });
      await expect(service.remove(institutionId, 'att-1', userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequest in CLOSED period', async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(baseAttendance);
      authzMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authzMock.canDelete.mockResolvedValue({ allowed: true });
      prismaMock.$queryRaw.mockResolvedValue([{ id: periodId, status: 'CLOSED' }]);
      await expect(service.remove(institutionId, 'att-1', userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================
  // BULK CREATE
  // ============================================================
  describe('bulkCreate', () => {
    const bulkDto = {
      courseId,
      academicPeriodId: periodId,
      date: dateStr,
      records: [
        { studentId, status: AttendanceStatus.PRESENT },
        { studentId: 'student-2', status: AttendanceStatus.ABSENT, notes: 'Sin justificar' },
      ],
    };

    it('should bulk create attendance with server-derived tenant fields', async () => {
      authzMock.getUserRole.mockResolvedValue('TEACHER');
      authzMock.canCreate.mockResolvedValue({ allowed: true });
      prismaMock.course.findFirst.mockResolvedValue({ id: courseId });
      prismaMock.academicPeriod.findFirst.mockResolvedValue({ id: periodId });
      prismaMock.$queryRaw.mockResolvedValue([{ id: periodId, status: 'ACTIVE' }]);
      prismaMock.enrollment.findMany.mockResolvedValue([
        { studentId },
        { studentId: 'student-2' },
      ]);
      prismaMock.attendance.findMany.mockResolvedValue([]);
      prismaMock.attendance.createMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkCreate(institutionId, bulkDto, userId, '1.2.3.4');

      expect(prismaMock.attendance.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ institutionId, recordedById: userId, courseId }),
        ]),
        skipDuplicates: true,
      });
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ATTENDANCE_BULK_CREATED' }),
      );
      expect(result.created).toBe(2);
    });

    it('should reject an unauthorized course', async () => {
      authzMock.getUserRole.mockResolvedValue('TEACHER');
      authzMock.canCreate.mockResolvedValue({ allowed: false, reason: 'NO_COURSE_RELATIONSHIP' });
      await expect(service.bulkCreate(institutionId, bulkDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject when a student is not enrolled in the course', async () => {
      authzMock.getUserRole.mockResolvedValue('TEACHER');
      authzMock.canCreate.mockResolvedValue({ allowed: true });
      prismaMock.course.findFirst.mockResolvedValue({ id: courseId });
      prismaMock.academicPeriod.findFirst.mockResolvedValue({ id: periodId });
      prismaMock.$queryRaw.mockResolvedValue([{ id: periodId, status: 'ACTIVE' }]);
      prismaMock.enrollment.findMany.mockResolvedValue([{ studentId }]);
      await expect(service.bulkCreate(institutionId, bulkDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should skip already-existing records (idempotent)', async () => {
      authzMock.getUserRole.mockResolvedValue('TEACHER');
      authzMock.canCreate.mockResolvedValue({ allowed: true });
      prismaMock.course.findFirst.mockResolvedValue({ id: courseId });
      prismaMock.academicPeriod.findFirst.mockResolvedValue({ id: periodId });
      prismaMock.$queryRaw.mockResolvedValue([{ id: periodId, status: 'ACTIVE' }]);
      prismaMock.enrollment.findMany.mockResolvedValue([{ studentId }, { studentId: 'student-2' }]);
      // student-2 already recorded -> skipped
      prismaMock.attendance.findMany.mockResolvedValue([{ studentId: 'student-2' }]);
      prismaMock.attendance.createMany.mockResolvedValue({ count: 1 });

      const result = await service.bulkCreate(institutionId, bulkDto, userId, '1.2.3.4');

      expect(prismaMock.attendance.createMany).toHaveBeenCalled();
      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should throw BadRequest in CLOSED period', async () => {
      authzMock.getUserRole.mockResolvedValue('TEACHER');
      authzMock.canCreate.mockResolvedValue({ allowed: true });
      prismaMock.course.findFirst.mockResolvedValue({ id: courseId });
      prismaMock.academicPeriod.findFirst.mockResolvedValue({ id: periodId });
      prismaMock.$queryRaw.mockResolvedValue([{ id: periodId, status: 'CLOSED' }]);
      await expect(service.bulkCreate(institutionId, bulkDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should roll back (throw) when transaction fails', async () => {
      authzMock.getUserRole.mockResolvedValue('TEACHER');
      authzMock.canCreate.mockResolvedValue({ allowed: true });
      prismaMock.course.findFirst.mockResolvedValue({ id: courseId });
      prismaMock.academicPeriod.findFirst.mockResolvedValue({ id: periodId });
      prismaMock.$queryRaw.mockResolvedValue([{ id: periodId, status: 'ACTIVE' }]);
      prismaMock.enrollment.findMany.mockResolvedValue([{ studentId }, { studentId: 'student-2' }]);
      prismaMock.attendance.findMany.mockResolvedValue([]);
      prismaMock.attendance.createMany.mockRejectedValue(new Error('db failure'));
      await expect(service.bulkCreate(institutionId, bulkDto, userId)).rejects.toThrow(
        'db failure',
      );
    });
  });
});
