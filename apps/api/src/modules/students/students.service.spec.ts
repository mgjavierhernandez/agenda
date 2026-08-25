import { NotFoundException, ConflictException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { DocumentType, StudentStatus } from '@prisma/client';

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
    };

    auditServiceMock = { log: jest.fn() };

    service = new StudentsService(
      prismaMock as never,
      auditServiceMock as never,
    );
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

      await expect(
        service.findOne(institutionId, 'student-from-other-tenant'),
      ).rejects.toThrow(NotFoundException);
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
        service.update(
          institutionId,
          'student-1',
          { documentNumber: '30999999' },
          userId,
        ),
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
