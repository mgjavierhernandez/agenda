import { Test, TestingModule } from '@nestjs/testing';
import { TeacherAssignmentsService } from './teacher-assignments.service';
import { PrismaService } from '../../common/prisma';
import { AuditService } from '../../common/audit/audit.service';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { TeacherAssignmentStatus } from '@prisma/client';

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
    };
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
      prisma.teacherAssignment.create.mockResolvedValue({ id: 'ta-1', ...dto, institutionId: mockInstitutionId, status: TeacherAssignmentStatus.ACTIVE });

      const result = await service.create(mockInstitutionId, dto, mockUserId, mockIp);

      expect(result.id).toBe('ta-1');
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'TEACHER_ASSIGNMENT_CREATED' }));
    });

    it('should throw ForbiddenException if teacher not in tenant', async () => {
      prisma.userInstitution.findFirst.mockResolvedValue(null);

      await expect(service.create(mockInstitutionId, dto, mockUserId, mockIp)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if course not found', async () => {
      prisma.userInstitution.findFirst.mockResolvedValue({ id: 'ui-1' });
      prisma.course.findFirst.mockResolvedValue(null);

      await expect(service.create(mockInstitutionId, dto, mockUserId, mockIp)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if subject not found', async () => {
      prisma.userInstitution.findFirst.mockResolvedValue({ id: 'ui-1' });
      prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(service.create(mockInstitutionId, dto, mockUserId, mockIp)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if academicPeriod not found', async () => {
      prisma.userInstitution.findFirst.mockResolvedValue({ id: 'ui-1' });
      prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
      prisma.subject.findFirst.mockResolvedValue({ id: 'subject-1' });
      prisma.academicPeriod.findFirst.mockResolvedValue(null);

      await expect(service.create(mockInstitutionId, dto, mockUserId, mockIp)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate assignment', async () => {
      prisma.userInstitution.findFirst.mockResolvedValue({ id: 'ui-1' });
      prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
      prisma.subject.findFirst.mockResolvedValue({ id: 'subject-1' });
      prisma.academicPeriod.findFirst.mockResolvedValue({ id: 'period-1' });
      prisma.teacherAssignment.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(mockInstitutionId, dto, mockUserId, mockIp)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a teacher assignment', async () => {
      prisma.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1', institutionId: mockInstitutionId });

      const result = await service.findOne(mockInstitutionId, 'ta-1');
      expect(result.id).toBe('ta-1');
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.teacherAssignment.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockInstitutionId, 'nonexistent')).rejects.toThrow(NotFoundException);
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
      prisma.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1', institutionId: mockInstitutionId, status: TeacherAssignmentStatus.ACTIVE });
      prisma.teacherAssignment.update.mockResolvedValue({ id: 'ta-1', status: TeacherAssignmentStatus.INACTIVE });

      const result = await service.update(mockInstitutionId, 'ta-1', { status: TeacherAssignmentStatus.INACTIVE }, mockUserId, mockIp);

      expect(result.status).toBe(TeacherAssignmentStatus.INACTIVE);
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'TEACHER_ASSIGNMENT_UPDATED' }));
    });

    it('should throw NotFoundException if assignment not found', async () => {
      prisma.teacherAssignment.findFirst.mockResolvedValue(null);

      await expect(service.update(mockInstitutionId, 'nonexistent', { status: TeacherAssignmentStatus.INACTIVE }, mockUserId, mockIp)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should set status to INACTIVE', async () => {
      prisma.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1', institutionId: mockInstitutionId, status: TeacherAssignmentStatus.ACTIVE });
      prisma.teacherAssignment.update.mockResolvedValue({ id: 'ta-1', status: TeacherAssignmentStatus.INACTIVE });

      const result = await service.deactivate(mockInstitutionId, 'ta-1', mockUserId, mockIp);

      expect(result.status).toBe(TeacherAssignmentStatus.INACTIVE);
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'TEACHER_ASSIGNMENT_DEACTIVATED' }));
    });
  });
});
