import { NotFoundException, ConflictException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { DocumentType, StudentStatus, Prisma } from '@prisma/client';

describe('StudentsService', () => {
  let service: StudentsService;
  let prismaMock: {
    student: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    guardianStudent: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    userInstitution: { findUnique: jest.Mock };
    userRole: { findMany: jest.Mock };
    globalUserRole: { findFirst: jest.Mock };
    teacherAssignment: { findMany: jest.Mock };
    courseDirectorAssignment: { findMany: jest.Mock };
    enrollment: { findMany: jest.Mock };
  };
  let auditServiceMock: { log: jest.Mock };

  const institutionId = 'inst-1';
  const userId = 'user-1';

  beforeEach(() => {
    prismaMock = {
      student: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      guardianStudent: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      userInstitution: { findUnique: jest.fn() },
      userRole: { findMany: jest.fn() },
      globalUserRole: { findFirst: jest.fn() },
      teacherAssignment: { findMany: jest.fn() },
      courseDirectorAssignment: { findMany: jest.fn() },
      enrollment: { findMany: jest.fn() },
    };

    auditServiceMock = { log: jest.fn() };

    service = new StudentsService(prismaMock as never, auditServiceMock as never);

    // Default: administrative caller with unrestricted scope.
    prismaMock.userInstitution.findUnique.mockResolvedValue({ id: 'mem-1' });
    prismaMock.userRole.findMany.mockResolvedValue([{ role: { name: 'INSTITUTION_ADMIN' } }]);
    prismaMock.teacherAssignment.findMany.mockResolvedValue([]);
    prismaMock.courseDirectorAssignment.findMany.mockResolvedValue([]);
    prismaMock.enrollment.findMany.mockResolvedValue([]);
    prismaMock.guardianStudent.findMany.mockResolvedValue([]);
    prismaMock.globalUserRole.findFirst.mockResolvedValue(null);
  });

  describe('create', () => {
    it('should create a student with tenant institutionId', async () => {
      prismaMock.student.findUnique.mockResolvedValue(null);
      prismaMock.student.create.mockResolvedValue({
        id: 'student-1',
        institutionId,
        firstName: 'Lucía',
        lastName: 'Fernández',
        documentType: DocumentType.DNI,
        documentNumber: '30123456',
        dateOfBirth: new Date('2010-03-15'),
        status: StudentStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        institutionId,
        {
          firstName: 'Lucía',
          lastName: 'Fernández',
          documentType: DocumentType.DNI,
          documentNumber: '30123456',
          dateOfBirth: '2010-03-15',
        },
        userId,
      );

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.student.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institutionId }),
        }),
      );
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STUDENT_CREATED',
          institutionId,
          userId,
        }),
      );
    });

    it('should reject duplicate document within same tenant', async () => {
      prismaMock.student.findUnique.mockResolvedValue({
        id: 'existing',
        institutionId,
      });

      await expect(
        service.create(
          institutionId,
          {
            firstName: 'Lucía',
            lastName: 'Fernández',
            documentType: DocumentType.DNI,
            documentNumber: '30123456',
          },
          userId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should map concurrent duplicate insert (P2002) to ConflictException', async () => {
      prismaMock.student.findUnique.mockResolvedValue(null);
      prismaMock.student.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create(
          institutionId,
          {
            firstName: 'Lucía',
            lastName: 'Fernández',
            documentType: DocumentType.DNI,
            documentNumber: '30123456',
          },
          userId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow same document in different tenant', async () => {
      prismaMock.student.findUnique.mockResolvedValue(null);
      prismaMock.student.create.mockResolvedValue({
        id: 'student-2',
        institutionId: 'inst-2',
        firstName: 'Lucía',
        lastName: 'Fernández',
        documentType: DocumentType.DNI,
        documentNumber: '30123456',
        status: StudentStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        'inst-2',
        {
          firstName: 'Lucía',
          lastName: 'Fernández',
          documentType: DocumentType.DNI,
          documentNumber: '30123456',
        },
        userId,
      );

      expect(result.institutionId).toBe('inst-2');
    });
  });

  // Helpers for scope resolution (GAP-5): default mocks = no membership => deny.
  function mockNoMembership() {
    prismaMock.userInstitution.findUnique.mockResolvedValue(null);
  }

  function mockRoles(...names: string[]) {
    prismaMock.userInstitution.findUnique.mockResolvedValue({ id: 'm-1' });
    prismaMock.userRole.findMany.mockResolvedValue(names.map((name) => ({ role: { name } })));
  }

  function mockNoLinks() {
    prismaMock.teacherAssignment.findMany.mockResolvedValue([]);
    prismaMock.courseDirectorAssignment.findMany.mockResolvedValue([]);
    prismaMock.enrollment.findMany.mockResolvedValue([]);
    prismaMock.student.findFirst.mockResolvedValue(null);
    prismaMock.guardianStudent.findMany.mockResolvedValue([]);
  }

  describe('findOne', () => {
    it('should find student only in current tenant', async () => {
      prismaMock.student.findFirst.mockResolvedValue({
        id: 'student-1',
        institutionId,
      });

      const result = await service.findOne(institutionId, 'student-1');

      expect(result.institutionId).toBe(institutionId);
      expect(prismaMock.student.findFirst).toHaveBeenCalledWith({
        where: { id: 'student-1', institutionId },
      });
    });

    it('should throw NotFoundException for cross-tenant resource', async () => {
      prismaMock.student.findFirst.mockResolvedValue(null);

      await expect(service.findOne(institutionId, 'student-from-other-tenant')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow parent to access linked student', async () => {
      mockRoles('PARENT');
      mockNoLinks();
      prismaMock.guardianStudent.findMany.mockResolvedValue([{ studentId: 'student-linked' }]);
      prismaMock.student.findFirst.mockResolvedValue({
        id: 'student-linked',
        institutionId,
      });

      const result = await service.findOne(institutionId, 'student-linked', 'parent-user-1');

      expect(result.id).toBe('student-linked');
    });

    it('should deny parent access to unlinked student', async () => {
      mockRoles('PARENT');
      mockNoLinks();

      await expect(
        service.findOne(institutionId, 'student-unlinked', 'parent-user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow admin roles to access any student', async () => {
      mockRoles('INSTITUTION_ADMIN');
      prismaMock.student.findFirst.mockResolvedValue({
        id: 'student-1',
        institutionId,
      });

      const result = await service.findOne(institutionId, 'student-1', 'admin-user-1');

      expect(result.id).toBe('student-1');
    });

    it('should allow teacher to access a student of their course', async () => {
      mockRoles('TEACHER');
      prismaMock.teacherAssignment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
      prismaMock.courseDirectorAssignment.findMany.mockResolvedValue([]);
      prismaMock.enrollment.findMany.mockResolvedValue([{ studentId: 'student-1' }]);
      prismaMock.guardianStudent.findMany.mockResolvedValue([]);
      prismaMock.student.findFirst.mockResolvedValue({ id: 'student-1', institutionId });

      const result = await service.findOne(institutionId, 'student-1', 'teacher-user-1');

      expect(result.id).toBe('student-1');
    });

    it('should deny teacher access to a student outside their courses', async () => {
      mockRoles('TEACHER');
      prismaMock.teacherAssignment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
      prismaMock.courseDirectorAssignment.findMany.mockResolvedValue([]);
      prismaMock.enrollment.findMany.mockResolvedValue([{ studentId: 'student-1' }]);
      prismaMock.guardianStudent.findMany.mockResolvedValue([]);

      await expect(
        service.findOne(institutionId, 'student-other', 'teacher-user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow a student to access only their own record', async () => {
      mockRoles('STUDENT');
      mockNoLinks();
      prismaMock.student.findFirst.mockResolvedValue({ id: 'student-own' });

      const result = await service.findOne(institutionId, 'student-own', 'student-user-1');
      expect(result.id).toBe('student-own');

      await expect(
        service.findOne(institutionId, 'student-other', 'student-user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should deny access when the actor has no membership', async () => {
      mockNoMembership();

      await expect(service.findOne(institutionId, 'student-1', 'stranger-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return only current tenant students', async () => {
      prismaMock.student.findMany.mockResolvedValue([
        { id: 's1', institutionId },
        { id: 's2', institutionId },
      ]);
      prismaMock.student.count.mockResolvedValue(2);

      const result = await service.findAll(institutionId, {});

      expect(result.data).toHaveLength(2);
      expect(prismaMock.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
        }),
      );
    });

    it('should apply pagination', async () => {
      prismaMock.student.findMany.mockResolvedValue([]);
      prismaMock.student.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, { page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(prismaMock.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by search term within tenant', async () => {
      prismaMock.student.findMany.mockResolvedValue([]);
      prismaMock.student.count.mockResolvedValue(0);

      await service.findAll(institutionId, { search: 'Lucía' });

      expect(prismaMock.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institutionId,
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should return only linked students for parent user', async () => {
      mockRoles('PARENT');
      mockNoLinks();
      prismaMock.guardianStudent.findMany.mockResolvedValue([
        { studentId: 'student-linked-1' },
        { studentId: 'student-linked-2' },
      ]);
      prismaMock.student.findMany.mockResolvedValue([
        { id: 'student-linked-1', institutionId },
        { id: 'student-linked-2', institutionId },
      ]);
      prismaMock.student.count.mockResolvedValue(2);

      const result = await service.findAll(institutionId, {}, 'parent-user-1');

      expect(result.data).toHaveLength(2);
      expect(prismaMock.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['student-linked-1', 'student-linked-2'] },
          }),
        }),
      );
    });

    it('should return only course students for teacher user', async () => {
      mockRoles('TEACHER');
      prismaMock.teacherAssignment.findMany.mockResolvedValue([{ courseId: 'course-1' }]);
      prismaMock.courseDirectorAssignment.findMany.mockResolvedValue([]);
      prismaMock.enrollment.findMany.mockResolvedValue([{ studentId: 's1' }, { studentId: 's2' }]);
      prismaMock.guardianStudent.findMany.mockResolvedValue([]);
      prismaMock.student.findMany.mockResolvedValue([
        { id: 's1', institutionId },
        { id: 's2', institutionId },
      ]);
      prismaMock.student.count.mockResolvedValue(2);

      const result = await service.findAll(institutionId, {}, 'teacher-user-1');

      expect(result.data).toHaveLength(2);
      expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ courseId: { in: ['course-1'] }, status: 'ACTIVE' }),
        }),
      );
      expect(prismaMock.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: ['s1', 's2'] } }),
        }),
      );
    });

    it('should return empty list for teacher without courses', async () => {
      mockRoles('TEACHER');
      mockNoLinks();
      prismaMock.student.findMany.mockResolvedValue([]);
      prismaMock.student.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, {}, 'teacher-user-1');

      expect(result.data).toHaveLength(0);
      expect(prismaMock.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: [] } }),
        }),
      );
    });

    it('should return all students for admin roles', async () => {
      mockRoles('RECTOR');
      prismaMock.student.findMany.mockResolvedValue([
        { id: 's1', institutionId },
        { id: 's2', institutionId },
        { id: 's3', institutionId },
      ]);
      prismaMock.student.count.mockResolvedValue(3);

      const result = await service.findAll(institutionId, {}, 'rector-user-1');

      expect(result.data).toHaveLength(3);
      expect(prismaMock.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
        }),
      );
    });

    it('should return only their own record for student user', async () => {
      mockRoles('STUDENT');
      mockNoLinks();
      prismaMock.student.findFirst.mockResolvedValue({ id: 'student-own' });
      prismaMock.student.findMany.mockResolvedValue([{ id: 'student-own', institutionId }]);
      prismaMock.student.count.mockResolvedValue(1);

      const result = await service.findAll(institutionId, {}, 'student-user-1');

      expect(result.data).toHaveLength(1);
      expect(prismaMock.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: ['student-own'] } }),
        }),
      );
    });

    it('should return all students when no userId provided', async () => {
      prismaMock.student.findMany.mockResolvedValue([{ id: 's1', institutionId }]);
      prismaMock.student.count.mockResolvedValue(1);

      const result = await service.findAll(institutionId, {});

      expect(result.data).toHaveLength(1);
      expect(prismaMock.userRole.findMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update student only in current tenant', async () => {
      prismaMock.student.findFirst.mockResolvedValue({
        id: 'student-1',
        institutionId,
        firstName: 'Lucía',
        lastName: 'Fernández',
        documentType: DocumentType.DNI,
        documentNumber: '30123456',
        status: StudentStatus.ACTIVE,
      });
      prismaMock.student.update.mockResolvedValue({
        id: 'student-1',
        institutionId,
        firstName: 'Lucía Updated',
      });

      const result = await service.update(
        institutionId,
        'student-1',
        { firstName: 'Lucía Updated' },
        userId,
      );

      expect(result.firstName).toBe('Lucía Updated');
    });

    it('should throw NotFoundException for cross-tenant update', async () => {
      prismaMock.student.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'other-tenant-student', { firstName: 'X' }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not allow modifying institutionId', async () => {
      prismaMock.student.findFirst.mockResolvedValue({
        id: 'student-1',
        institutionId,
        firstName: 'Lucía',
        documentType: DocumentType.DNI,
        documentNumber: '30123456',
        status: StudentStatus.ACTIVE,
      });
      prismaMock.student.update.mockResolvedValue({
        id: 'student-1',
        institutionId,
      });

      await service.update(institutionId, 'student-1', { firstName: 'X' }, userId);

      const updateCall = prismaMock.student.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('institutionId');
    });

    it('should reject duplicate document within same tenant on update', async () => {
      prismaMock.student.findFirst
        .mockResolvedValueOnce({
          id: 'student-1',
          institutionId,
          documentType: DocumentType.DNI,
          documentNumber: '30123456',
        })
        .mockResolvedValueOnce({
          id: 'student-2',
          institutionId,
        });

      await expect(
        service.update(institutionId, 'student-1', { documentNumber: '30999999' }, userId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('should set status to INACTIVE', async () => {
      prismaMock.student.findFirst.mockResolvedValue({
        id: 'student-1',
        institutionId,
        documentType: DocumentType.DNI,
        documentNumber: '30123456',
        status: StudentStatus.ACTIVE,
      });
      prismaMock.student.update.mockResolvedValue({
        id: 'student-1',
        institutionId,
        status: StudentStatus.INACTIVE,
      });

      const result = await service.deactivate(institutionId, 'student-1', userId);

      expect(result.status).toBe(StudentStatus.INACTIVE);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STUDENT_DEACTIVATED',
        }),
      );
    });
  });
});
