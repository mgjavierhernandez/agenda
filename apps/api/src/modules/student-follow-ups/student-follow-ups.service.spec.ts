import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { StudentFollowUpsService } from './student-follow-ups.service';
import {
  FollowUpType,
  FollowUpSeverity,
  FollowUpStatus,
  FollowUpConfidentiality,
  FollowUpEntryType,
  CommitmentStatus,
  CommitmentResponsibleRole,
} from '@prisma/client';

jest.mock('./follow-up-notification.helper', () => ({
  sendFollowUpNotification: jest.fn().mockResolvedValue(undefined),
  sendCommitmentNotification: jest.fn().mockResolvedValue(undefined),
}));

describe('StudentFollowUpsService', () => {
  let service: StudentFollowUpsService;
  let prismaMock: {
    studentFollowUp: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    followUpEntry: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    commitment: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    followUpAttachment: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    fileAsset: {
      findFirst: jest.Mock;
    };
    student: {
      findFirst: jest.Mock;
    };
    user: {
      findFirst: jest.Mock;
    };
    userInstitution: {
      findFirst: jest.Mock;
    };
    followUpCategory: {
      findFirst: jest.Mock;
    };
  };
  let auditServiceMock: { log: jest.Mock };
  let authServiceMock: {
    canCreate: jest.Mock;
    canRead: jest.Mock;
    canUpdate: jest.Mock;
    canClose: jest.Mock;
    canManage: jest.Mock;
    buildListFilter: jest.Mock;
    getVisibleConfidentialityLevels: jest.Mock;
    getUserRole: jest.Mock;
    hasStudentRelationship: jest.Mock;
  };

  const institutionId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const studentId = '00000000-0000-0000-0000-000000000003';
  const followUpId = '00000000-0000-0000-0000-000000000004';
  const categoryId = '00000000-0000-0000-0000-000000000005';
  const otherStudentId = '00000000-0000-0000-0000-000000000060';

  beforeEach(() => {
    prismaMock = {
      studentFollowUp: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      followUpEntry: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      commitment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      followUpAttachment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      fileAsset: {
        findFirst: jest.fn(),
      },
      student: {
        findFirst: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
      userInstitution: {
        findFirst: jest.fn(),
      },
      followUpCategory: {
        findFirst: jest.fn(),
      },
    };

    auditServiceMock = { log: jest.fn() };

    authServiceMock = {
      canCreate: jest.fn(),
      canRead: jest.fn(),
      canUpdate: jest.fn(),
      canClose: jest.fn(),
      canManage: jest.fn(),
      buildListFilter: jest.fn(),
      getVisibleConfidentialityLevels: jest.fn(),
      getUserRole: jest.fn(),
      hasStudentRelationship: jest.fn(),
    };

    service = new StudentFollowUpsService(
      prismaMock as never,
      auditServiceMock as never,
      authServiceMock as never,
    );
  });

  describe('create', () => {
    it('should create a follow-up for ADMIN with valid student in tenant', async () => {
      authServiceMock.canCreate.mockResolvedValue({ allowed: true });
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId });
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);
      prismaMock.studentFollowUp.create.mockResolvedValue({
        id: followUpId,
        institutionId,
        studentId,
        createdById: userId,
        type: FollowUpType.ACADEMICO,
        severity: FollowUpSeverity.MEDIUM,
        status: FollowUpStatus.OPEN,
        confidentiality: FollowUpConfidentiality.INTERNAL,
        title: 'Test follow-up',
        summary: null,
        description: null,
        categoryId: null,
        closedAt: null,
        closedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        institutionId,
        {
          studentId,
          type: FollowUpType.ACADEMICO,
          title: 'Test follow-up',
        },
        userId,
      );

      expect(result.institutionId).toBe(institutionId);
      expect(result.studentId).toBe(studentId);
      expect(result.createdById).toBe(userId);
      expect(result.status).toBe(FollowUpStatus.OPEN);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STUDENT_FOLLOW_UP_CREATED',
          institutionId,
          userId,
        }),
      );
    });

    it('should reject TEACHER creating for unassigned student', async () => {
      authServiceMock.canCreate.mockResolvedValue({
        allowed: false,
        reason: 'NO_STUDENT_RELATIONSHIP',
      });

      await expect(
        service.create(
          institutionId,
          { studentId, type: FollowUpType.ACADEMICO, title: 'Test' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject PARENT attempting to create', async () => {
      authServiceMock.canCreate.mockResolvedValue({
        allowed: false,
        reason: 'INSUFFICIENT_PERMISSIONS',
      });

      await expect(
        service.create(
          institutionId,
          { studentId, type: FollowUpType.ACADEMICO, title: 'Test' },
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject STUDENT attempting to create', async () => {
      authServiceMock.canCreate.mockResolvedValue({
        allowed: false,
        reason: 'INSUFFICIENT_PERMISSIONS',
      });

      await expect(
        service.create(
          institutionId,
          { studentId, type: FollowUpType.ACADEMICO, title: 'Test' },
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject SUPER_ADMIN attempting to create', async () => {
      authServiceMock.canCreate.mockResolvedValue({
        allowed: false,
        reason: 'SUPER_ADMIN_NO_ACCESS',
      });

      await expect(
        service.create(
          institutionId,
          { studentId, type: FollowUpType.ACADEMICO, title: 'Test' },
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject creating for student in another tenant', async () => {
      authServiceMock.canCreate.mockResolvedValue({ allowed: true });
      prismaMock.student.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          institutionId,
          { studentId: otherStudentId, type: FollowUpType.ACADEMICO, title: 'Test' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject with non-existent category', async () => {
      authServiceMock.canCreate.mockResolvedValue({ allowed: true });
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId });
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          institutionId,
          {
            studentId,
            type: FollowUpType.ACADEMICO,
            title: 'Test',
            categoryId,
          },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject category from another tenant', async () => {
      authServiceMock.canCreate.mockResolvedValue({ allowed: true });
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId });
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          institutionId,
          {
            studentId,
            type: FollowUpType.ACADEMICO,
            title: 'Test',
            categoryId,
          },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create with all optional fields', async () => {
      authServiceMock.canCreate.mockResolvedValue({ allowed: true });
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId });
      prismaMock.followUpCategory.findFirst.mockResolvedValue({ id: categoryId });
      prismaMock.studentFollowUp.create.mockResolvedValue({
        id: followUpId,
        institutionId,
        studentId,
        createdById: userId,
        type: FollowUpType.CONVIVENCIA,
        severity: FollowUpSeverity.HIGH,
        status: FollowUpStatus.OPEN,
        confidentiality: FollowUpConfidentiality.CONFIDENTIAL,
        title: 'Complete follow-up',
        summary: 'Summary text',
        description: 'Description text',
        categoryId,
        closedAt: null,
        closedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        institutionId,
        {
          studentId,
          type: FollowUpType.CONVIVENCIA,
          severity: FollowUpSeverity.HIGH,
          confidentiality: FollowUpConfidentiality.CONFIDENTIAL,
          categoryId,
          title: 'Complete follow-up',
          summary: 'Summary text',
          description: 'Description text',
        },
        userId,
      );

      expect(result.title).toBe('Complete follow-up');
      expect(result.confidentiality).toBe(FollowUpConfidentiality.CONFIDENTIAL);
    });
  });

  describe('findOne', () => {
    it('should find a follow-up for ADMIN in own tenant', async () => {
      authServiceMock.canRead.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        studentId,
        createdById: userId,
        type: FollowUpType.ACADEMICO,
        severity: FollowUpSeverity.MEDIUM,
        status: FollowUpStatus.OPEN,
        confidentiality: FollowUpConfidentiality.INTERNAL,
        title: 'Test follow-up',
        summary: null,
        description: null,
        categoryId: null,
        closedAt: null,
        closedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        student: { id: studentId, firstName: 'Juan', lastName: 'Perez' },
        createdBy: { id: userId, firstName: 'Admin', lastName: 'User' },
        closedBy: null,
        category: null,
      });

      const result = await service.findOne(institutionId, followUpId, userId);

      expect(result.id).toBe(followUpId);
      expect(result.institutionId).toBe(institutionId);
    });

    it('should return 404 for follow-up in another tenant (IDOR)', async () => {
      authServiceMock.canRead.mockResolvedValue({
        allowed: false,
        reason: 'NOT_FOUND',
      });

      await expect(
        service.findOne(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should deny TEACHER access to follow-up of unassigned student', async () => {
      authServiceMock.canRead.mockResolvedValue({
        allowed: false,
        reason: 'NO_STUDENT_RELATIONSHIP',
      });

      await expect(
        service.findOne(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should deny PARENT access to follow-up of unlinked student', async () => {
      authServiceMock.canRead.mockResolvedValue({
        allowed: false,
        reason: 'NO_STUDENT_RELATIONSHIP',
      });

      await expect(
        service.findOne(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should deny STUDENT access to follow-up of another student', async () => {
      authServiceMock.canRead.mockResolvedValue({
        allowed: false,
        reason: 'NO_STUDENT_RELATIONSHIP',
      });

      await expect(
        service.findOne(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should deny SUPER_ADMIN access', async () => {
      authServiceMock.canRead.mockResolvedValue({
        allowed: false,
        reason: 'SUPER_ADMIN_NO_ACCESS',
      });

      await expect(
        service.findOne(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should deny access to CONFIDENTIAL follow-up for TEACHER', async () => {
      authServiceMock.canRead.mockResolvedValue({
        allowed: false,
        reason: 'CONFIDENTIALITY_RESTRICTED',
      });

      await expect(
        service.findOne(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should deny access to SENSITIVE follow-up for PARENT', async () => {
      authServiceMock.canRead.mockResolvedValue({
        allowed: false,
        reason: 'CONFIDENTIALITY_RESTRICTED',
      });

      await expect(
        service.findOne(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return empty for SUPER_ADMIN', async () => {
      authServiceMock.getUserRole.mockResolvedValue('SUPER_ADMIN');

      const result = await service.findAll(institutionId, {}, userId);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should return empty for user with no role', async () => {
      authServiceMock.getUserRole.mockResolvedValue(null);

      const result = await service.findAll(institutionId, {}, userId);

      expect(result.data).toHaveLength(0);
    });

    it('should list follow-ups for ADMIN in own tenant', async () => {
      authServiceMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
        FollowUpConfidentiality.CONFIDENTIAL,
        FollowUpConfidentiality.SENSITIVE,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([
        { id: followUpId, institutionId, title: 'Test' },
      ]);
      prismaMock.studentFollowUp.count.mockResolvedValue(1);

      const result = await service.findAll(institutionId, {}, userId);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should list only PUBLIC/INTERNAL for TEACHER', async () => {
      authServiceMock.getUserRole.mockResolvedValue('TEACHER');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, {}, userId);

      expect(result.data).toHaveLength(0);
    });

    it('should list only linked students for PARENT', async () => {
      authServiceMock.getUserRole.mockResolvedValue('PARENT');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, {}, userId);

      expect(result.data).toHaveLength(0);
      expect(prismaMock.studentFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student: expect.objectContaining({
              guardianStudents: expect.objectContaining({
                some: expect.objectContaining({ guardianUserId: userId }),
              }),
            }),
          }),
        }),
      );
    });

    it('should list only own records for STUDENT', async () => {
      authServiceMock.getUserRole.mockResolvedValue('STUDENT');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, {}, userId);

      expect(result.data).toHaveLength(0);
      expect(prismaMock.studentFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student: expect.objectContaining({
              user: expect.objectContaining({ id: userId }),
            }),
          }),
        }),
      );
    });

    it('should apply studentId filter', async () => {
      authServiceMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
        FollowUpConfidentiality.CONFIDENTIAL,
        FollowUpConfidentiality.SENSITIVE,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      await service.findAll(institutionId, { studentId }, userId);

      expect(prismaMock.studentFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ studentId }),
        }),
      );
    });

    it('should apply type filter', async () => {
      authServiceMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
        FollowUpConfidentiality.CONFIDENTIAL,
        FollowUpConfidentiality.SENSITIVE,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      await service.findAll(institutionId, { type: FollowUpType.ACADEMICO }, userId);

      expect(prismaMock.studentFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: FollowUpType.ACADEMICO }),
        }),
      );
    });

    it('should apply status filter', async () => {
      authServiceMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
        FollowUpConfidentiality.CONFIDENTIAL,
        FollowUpConfidentiality.SENSITIVE,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      await service.findAll(institutionId, { status: FollowUpStatus.OPEN }, userId);

      expect(prismaMock.studentFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: FollowUpStatus.OPEN }),
        }),
      );
    });

    it('should apply search filter', async () => {
      authServiceMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
        FollowUpConfidentiality.CONFIDENTIAL,
        FollowUpConfidentiality.SENSITIVE,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      await service.findAll(institutionId, { search: 'test' }, userId);

      expect(prismaMock.studentFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.objectContaining({ contains: 'test' }) }),
            ]),
          }),
        }),
      );
    });

    it('should apply date range filter', async () => {
      authServiceMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
        FollowUpConfidentiality.CONFIDENTIAL,
        FollowUpConfidentiality.SENSITIVE,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      await service.findAll(
        institutionId,
        { createdFrom: '2026-01-01', createdTo: '2026-12-31' },
        userId,
      );

      expect(prismaMock.studentFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should apply pagination', async () => {
      authServiceMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
        FollowUpConfidentiality.CONFIDENTIAL,
        FollowUpConfidentiality.SENSITIVE,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      const result = await service.findAll(
        institutionId,
        { page: 2, limit: 10 },
        userId,
      );

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(prismaMock.studentFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should never expose cross-tenant data', async () => {
      authServiceMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
        FollowUpConfidentiality.CONFIDENTIAL,
        FollowUpConfidentiality.SENSITIVE,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      await service.findAll(institutionId, {}, userId);

      expect(prismaMock.studentFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
        }),
      );
    });
  });

  describe('update', () => {
    const existingFollowUp = {
      id: followUpId,
      institutionId,
      studentId,
      createdById: userId,
      type: FollowUpType.ACADEMICO,
      severity: FollowUpSeverity.MEDIUM,
      status: FollowUpStatus.OPEN,
      confidentiality: FollowUpConfidentiality.INTERNAL,
      title: 'Original title',
      summary: null,
      description: null,
      categoryId: null,
      closedAt: null,
      closedById: null,
    };

    it('should update follow-up for ADMIN', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(existingFollowUp);
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);
      prismaMock.studentFollowUp.update.mockResolvedValue({
        ...existingFollowUp,
        title: 'Updated title',
      });

      const result = await service.update(
        institutionId,
        followUpId,
        { title: 'Updated title' },
        userId,
      );

      expect(result.title).toBe('Updated title');
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STUDENT_FOLLOW_UP_UPDATED' }),
      );
    });

    it('should reject update on CLOSED record', async () => {
      authServiceMock.canUpdate.mockResolvedValue({
        allowed: false,
        reason: 'RECORD_CLOSED',
      });

      await expect(
        service.update(
          institutionId,
          followUpId,
          { title: 'Try' },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject TEACHER updating unassigned student follow-up', async () => {
      authServiceMock.canUpdate.mockResolvedValue({
        allowed: false,
        reason: 'NO_STUDENT_RELATIONSHIP',
      });

      await expect(
        service.update(
          institutionId,
          followUpId,
          { title: 'Try' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject PARENT attempting to update', async () => {
      authServiceMock.canUpdate.mockResolvedValue({
        allowed: false,
        reason: 'INSUFFICIENT_PERMISSIONS',
      });

      await expect(
        service.update(
          institutionId,
          followUpId,
          { title: 'Try' },
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject STUDENT attempting to update', async () => {
      authServiceMock.canUpdate.mockResolvedValue({
        allowed: false,
        reason: 'INSUFFICIENT_PERMISSIONS',
      });

      await expect(
        service.update(
          institutionId,
          followUpId,
          { title: 'Try' },
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject SUPER_ADMIN attempting to update', async () => {
      authServiceMock.canUpdate.mockResolvedValue({
        allowed: false,
        reason: 'SUPER_ADMIN_NO_ACCESS',
      });

      await expect(
        service.update(
          institutionId,
          followUpId,
          { title: 'Try' },
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject cross-tenant update', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(null);

      await expect(
        service.update(
          institutionId,
          followUpId,
          { title: 'Try' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not allow modifying institutionId', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(existingFollowUp);
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);
      prismaMock.studentFollowUp.update.mockResolvedValue(existingFollowUp);

      await service.update(
        institutionId,
        followUpId,
        { title: 'Updated' },
        userId,
      );

      const updateCall = prismaMock.studentFollowUp.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('institutionId');
    });

    it('should not allow modifying createdById', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(existingFollowUp);
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);
      prismaMock.studentFollowUp.update.mockResolvedValue(existingFollowUp);

      await service.update(
        institutionId,
        followUpId,
        { title: 'Updated' },
        userId,
      );

      const updateCall = prismaMock.studentFollowUp.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('createdById');
    });
  });

  describe('close', () => {
    const existingFollowUp = {
      id: followUpId,
      institutionId,
      studentId,
      createdById: userId,
      type: FollowUpType.ACADEMICO,
      severity: FollowUpSeverity.MEDIUM,
      status: FollowUpStatus.OPEN,
      confidentiality: FollowUpConfidentiality.INTERNAL,
      title: 'Test follow-up',
      closedAt: null,
      closedById: null,
    };

    it('should close a follow-up for ADMIN', async () => {
      authServiceMock.canClose.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(existingFollowUp);
      prismaMock.studentFollowUp.update.mockResolvedValue({
        ...existingFollowUp,
        status: FollowUpStatus.CLOSED,
        closedById: userId,
        closedAt: new Date(),
      });

      const result = await service.close(institutionId, followUpId, userId);

      expect(result.status).toBe(FollowUpStatus.CLOSED);
      expect(result.closedById).toBe(userId);
      expect(result.closedAt).toBeDefined();
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STUDENT_FOLLOW_UP_CLOSED' }),
      );
    });

    it('should close a follow-up for TEACHER', async () => {
      authServiceMock.canClose.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(existingFollowUp);
      prismaMock.studentFollowUp.update.mockResolvedValue({
        ...existingFollowUp,
        status: FollowUpStatus.CLOSED,
        closedById: userId,
        closedAt: new Date(),
      });

      const result = await service.close(institutionId, followUpId, userId);

      expect(result.status).toBe(FollowUpStatus.CLOSED);
    });

    it('should reject closing already closed record', async () => {
      authServiceMock.canClose.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        ...existingFollowUp,
        status: FollowUpStatus.CLOSED,
      });

      await expect(
        service.close(institutionId, followUpId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject double-close via canClose reason', async () => {
      authServiceMock.canClose.mockResolvedValue({
        allowed: false,
        reason: 'ALREADY_CLOSED',
      });

      await expect(
        service.close(institutionId, followUpId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject TEACHER closing unassigned student follow-up', async () => {
      authServiceMock.canClose.mockResolvedValue({
        allowed: false,
        reason: 'NO_STUDENT_RELATIONSHIP',
      });

      await expect(
        service.close(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject PARENT attempting to close', async () => {
      authServiceMock.canClose.mockResolvedValue({
        allowed: false,
        reason: 'INSUFFICIENT_PERMISSIONS',
      });

      await expect(
        service.close(institutionId, followUpId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject STUDENT attempting to close', async () => {
      authServiceMock.canClose.mockResolvedValue({
        allowed: false,
        reason: 'INSUFFICIENT_PERMISSIONS',
      });

      await expect(
        service.close(institutionId, followUpId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject SUPER_ADMIN attempting to close', async () => {
      authServiceMock.canClose.mockResolvedValue({
        allowed: false,
        reason: 'SUPER_ADMIN_NO_ACCESS',
      });

      await expect(
        service.close(institutionId, followUpId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject cross-tenant close', async () => {
      authServiceMock.canClose.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue(null);

      await expect(
        service.close(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('IDOR/BOLA protection', () => {
    it('should block parent accessing follow-up of unlinked student', async () => {
      authServiceMock.canRead.mockResolvedValue({
        allowed: false,
        reason: 'NO_STUDENT_RELATIONSHIP',
      });

      await expect(
        service.findOne(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should block student accessing follow-up of another student', async () => {
      authServiceMock.canRead.mockResolvedValue({
        allowed: false,
        reason: 'NO_STUDENT_RELATIONSHIP',
      });

      await expect(
        service.findOne(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should block teacher accessing follow-up of unassigned student', async () => {
      authServiceMock.canRead.mockResolvedValue({
        allowed: false,
        reason: 'NO_STUDENT_RELATIONSHIP',
      });

      await expect(
        service.findOne(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should block admin Tenant A accessing follow-up Tenant B', async () => {
      authServiceMock.canRead.mockResolvedValue({
        allowed: false,
        reason: 'NOT_FOUND',
      });

      await expect(
        service.findOne(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should block SUPER_ADMIN accessing any follow-up', async () => {
      authServiceMock.canRead.mockResolvedValue({
        allowed: false,
        reason: 'SUPER_ADMIN_NO_ACCESS',
      });

      await expect(
        service.findOne(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should never return follow-up data when unauthorized', async () => {
      authServiceMock.canRead.mockResolvedValue({
        allowed: false,
        reason: 'NO_STUDENT_RELATIONSHIP',
      });

      try {
        await service.findOne(institutionId, followUpId, userId);
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }

      expect(prismaMock.studentFollowUp.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('confidentiality enforcement', () => {
    it('should filter CONFIDENTIAL from list for TEACHER', async () => {
      authServiceMock.getUserRole.mockResolvedValue('TEACHER');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      await service.findAll(institutionId, {}, userId);

      expect(prismaMock.studentFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            confidentiality: {
              in: [
                FollowUpConfidentiality.PUBLIC,
                FollowUpConfidentiality.INTERNAL,
              ],
            },
          }),
        }),
      );
    });

    it('should filter CONFIDENTIAL/SENSITIVE from list for PARENT', async () => {
      authServiceMock.getUserRole.mockResolvedValue('PARENT');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      await service.findAll(institutionId, {}, userId);

      expect(prismaMock.studentFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            confidentiality: {
              in: [
                FollowUpConfidentiality.PUBLIC,
                FollowUpConfidentiality.INTERNAL,
              ],
            },
          }),
        }),
      );
    });

    it('should filter CONFIDENTIAL/SENSITIVE from list for STUDENT', async () => {
      authServiceMock.getUserRole.mockResolvedValue('STUDENT');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      await service.findAll(institutionId, {}, userId);

      expect(prismaMock.studentFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            confidentiality: {
              in: [
                FollowUpConfidentiality.PUBLIC,
                FollowUpConfidentiality.INTERNAL,
              ],
            },
          }),
        }),
      );
    });

    it('should allow ADMIN to see all confidentiality levels', async () => {
      authServiceMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
        FollowUpConfidentiality.CONFIDENTIAL,
        FollowUpConfidentiality.SENSITIVE,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      await service.findAll(institutionId, {}, userId);

      expect(prismaMock.studentFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            confidentiality: {
              in: [
                FollowUpConfidentiality.PUBLIC,
                FollowUpConfidentiality.INTERNAL,
                FollowUpConfidentiality.CONFIDENTIAL,
                FollowUpConfidentiality.SENSITIVE,
              ],
            },
          }),
        }),
      );
    });
  });

  describe('tenant isolation', () => {
    it('should always scope queries to institutionId', async () => {
      authServiceMock.getUserRole.mockResolvedValue('INSTITUTION_ADMIN');
      authServiceMock.getVisibleConfidentialityLevels.mockReturnValue([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
        FollowUpConfidentiality.CONFIDENTIAL,
        FollowUpConfidentiality.SENSITIVE,
      ]);
      prismaMock.studentFollowUp.findMany.mockResolvedValue([]);
      prismaMock.studentFollowUp.count.mockResolvedValue(0);

      await service.findAll(institutionId, {}, userId);

      expect(prismaMock.studentFollowUp.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
        }),
      );
    });

    it('should set institutionId from tenant context on create', async () => {
      authServiceMock.canCreate.mockResolvedValue({ allowed: true });
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId });
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);
      prismaMock.studentFollowUp.create.mockResolvedValue({
        id: followUpId,
        institutionId,
        studentId,
      });

      await service.create(
        institutionId,
        { studentId, type: FollowUpType.ACADEMICO, title: 'Test' },
        userId,
      );

      expect(prismaMock.studentFollowUp.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institutionId }),
        }),
      );
    });
  });

  describe('lifecycle validation', () => {
    it('should default status to OPEN on create', async () => {
      authServiceMock.canCreate.mockResolvedValue({ allowed: true });
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId });
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);
      prismaMock.studentFollowUp.create.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.OPEN,
      });

      const result = await service.create(
        institutionId,
        { studentId, type: FollowUpType.ACADEMICO, title: 'Test' },
        userId,
      );

      expect(result.status).toBe(FollowUpStatus.OPEN);
    });

    it('should set status to CLOSED on close', async () => {
      authServiceMock.canClose.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.studentFollowUp.update.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.CLOSED,
        closedById: userId,
        closedAt: new Date(),
      });

      const result = await service.close(institutionId, followUpId, userId);

      expect(result.status).toBe(FollowUpStatus.CLOSED);
    });

    it('should prevent updating a CLOSED record', async () => {
      authServiceMock.canUpdate.mockResolvedValue({
        allowed: false,
        reason: 'RECORD_CLOSED',
      });

      await expect(
        service.update(
          institutionId,
          followUpId,
          { title: 'Try' },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('audit fields', () => {
    it('should not allow modifying createdById via update', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        title: 'Test',
      });
      prismaMock.followUpCategory.findFirst.mockResolvedValue(null);
      prismaMock.studentFollowUp.update.mockResolvedValue({
        id: followUpId,
      });

      await service.update(
        institutionId,
        followUpId,
        { title: 'Updated' },
        userId,
      );

      const updateCall = prismaMock.studentFollowUp.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('createdById');
      expect(updateCall.data).not.toHaveProperty('closedById');
      expect(updateCall.data).not.toHaveProperty('createdAt');
    });

    it('should set closedById on close', async () => {
      authServiceMock.canClose.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.studentFollowUp.update.mockResolvedValue({
        id: followUpId,
        closedById: userId,
      });

      await service.close(institutionId, followUpId, userId);

      expect(prismaMock.studentFollowUp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            closedById: userId,
          }),
        }),
      );
    });

    it('should set closedAt on close', async () => {
      authServiceMock.canClose.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.studentFollowUp.update.mockResolvedValue({
        id: followUpId,
        closedAt: new Date(),
      });

      await service.close(institutionId, followUpId, userId);

      expect(prismaMock.studentFollowUp.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            closedById: userId,
            closedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ============================================================
  // ENTRIES TESTS
  // ============================================================

  describe('createEntry', () => {
    it('should create entry for ADMIN on OPEN follow-up', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.followUpEntry.create.mockResolvedValue({
        id: 'entry-1',
        followUpId,
        createdById: userId,
        entryType: FollowUpEntryType.NOTE,
        content: 'Test note',
        createdAt: new Date(),
      });

      const result = await service.createEntry(
        institutionId,
        followUpId,
        { entryType: FollowUpEntryType.NOTE, content: 'Test note' },
        userId,
      );

      expect(result.entryType).toBe(FollowUpEntryType.NOTE);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STUDENT_FOLLOW_UP_ENTRY_CREATED' }),
      );
    });

    it('should reject entry on CLOSED follow-up', async () => {
      authServiceMock.canUpdate.mockResolvedValue({
        allowed: false,
        reason: 'RECORD_CLOSED',
      });

      await expect(
        service.createEntry(
          institutionId,
          followUpId,
          { entryType: FollowUpEntryType.NOTE, content: 'Test' },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject entry for TEACHER on unassigned student', async () => {
      authServiceMock.canUpdate.mockResolvedValue({
        allowed: false,
        reason: 'NO_STUDENT_RELATIONSHIP',
      });

      await expect(
        service.createEntry(
          institutionId,
          followUpId,
          { entryType: FollowUpEntryType.NOTE, content: 'Test' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject entry for PARENT', async () => {
      authServiceMock.canUpdate.mockResolvedValue({
        allowed: false,
        reason: 'INSUFFICIENT_PERMISSIONS',
      });

      await expect(
        service.createEntry(
          institutionId,
          followUpId,
          { entryType: FollowUpEntryType.NOTE, content: 'Test' },
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject entry for SUPER_ADMIN', async () => {
      authServiceMock.canUpdate.mockResolvedValue({
        allowed: false,
        reason: 'SUPER_ADMIN_NO_ACCESS',
      });

      await expect(
        service.createEntry(
          institutionId,
          followUpId,
          { entryType: FollowUpEntryType.NOTE, content: 'Test' },
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findEntries', () => {
    it('should return entries for authorized user', async () => {
      authServiceMock.canRead.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({ id: followUpId });
      prismaMock.followUpEntry.findMany.mockResolvedValue([
        { id: 'entry-1', followUpId, entryType: FollowUpEntryType.NOTE },
      ]);
      prismaMock.followUpEntry.count.mockResolvedValue(1);

      const result = await service.findEntries(
        institutionId,
        followUpId,
        userId,
      );

      expect(result.data).toHaveLength(1);
    });

    it('should deny access to entries for unauthorized user', async () => {
      authServiceMock.canRead.mockResolvedValue({
        allowed: false,
        reason: 'NOT_FOUND',
      });

      await expect(
        service.findEntries(institutionId, followUpId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findEntry', () => {
    it('should return single entry', async () => {
      authServiceMock.canRead.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({ id: followUpId });
      prismaMock.followUpEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
        followUpId,
        entryType: FollowUpEntryType.NOTE,
        content: 'Test',
      });

      const result = await service.findEntry(
        institutionId,
        followUpId,
        'entry-1',
        userId,
      );

      expect(result.id).toBe('entry-1');
    });

    it('should return 404 for non-existent entry', async () => {
      authServiceMock.canRead.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({ id: followUpId });
      prismaMock.followUpEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.findEntry(institutionId, followUpId, 'entry-nonexistent', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateEntry', () => {
    it('should update entry content', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.followUpEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
        followUpId,
        entryType: FollowUpEntryType.NOTE,
        content: 'Old content',
      });
      prismaMock.followUpEntry.update.mockResolvedValue({
        id: 'entry-1',
        entryType: FollowUpEntryType.NOTE,
        content: 'Updated content',
      });

      const result = await service.updateEntry(
        institutionId,
        followUpId,
        'entry-1',
        { content: 'Updated content' },
        userId,
      );

      expect(result.content).toBe('Updated content');
    });

    it('should reject update for non-existent entry', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.followUpEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.updateEntry(
          institutionId,
          followUpId,
          'entry-nonexistent',
          { content: 'Test' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // COMMITMENTS TESTS
  // ============================================================

  describe('createCommitment', () => {
    const responsibleUserId = '00000000-0000-0000-0000-000000000010';

    it('should create commitment for ADMIN', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.user.findFirst.mockResolvedValue({ id: responsibleUserId });
      prismaMock.userInstitution.findFirst.mockResolvedValue({ userId: responsibleUserId, institutionId });
      prismaMock.commitment.create.mockResolvedValue({
        id: 'commit-1',
        followUpId,
        responsibleUserId,
        responsibleRole: CommitmentResponsibleRole.TEACHER,
        description: 'Follow up with parent',
        status: CommitmentStatus.PENDING,
        dueDate: null,
        completedAt: null,
        createdAt: new Date(),
      });

      const result = await service.createCommitment(
        institutionId,
        followUpId,
        {
          responsibleUserId,
          responsibleRole: CommitmentResponsibleRole.TEACHER,
          description: 'Follow up with parent',
        },
        userId,
      );

      expect(result.description).toBe('Follow up with parent');
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STUDENT_FOLLOW_UP_COMMITMENT_CREATED' }),
      );
    });

    it('should reject commitment for non-existent user', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.createCommitment(
          institutionId,
          followUpId,
          {
            responsibleUserId: 'nonexistent',
            responsibleRole: CommitmentResponsibleRole.TEACHER,
            description: 'Test',
          },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject commitment on CLOSED follow-up', async () => {
      authServiceMock.canUpdate.mockResolvedValue({
        allowed: false,
        reason: 'RECORD_CLOSED',
      });

      await expect(
        service.createCommitment(
          institutionId,
          followUpId,
          {
            responsibleUserId,
            responsibleRole: CommitmentResponsibleRole.TEACHER,
            description: 'Test',
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findCommitments', () => {
    it('should return commitments for authorized user', async () => {
      authServiceMock.canRead.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({ id: followUpId });
      prismaMock.commitment.findMany.mockResolvedValue([
        { id: 'commit-1', followUpId, description: 'Test' },
      ]);
      prismaMock.commitment.count.mockResolvedValue(1);

      const result = await service.findCommitments(
        institutionId,
        followUpId,
        userId,
      );

      expect(result.data).toHaveLength(1);
    });
  });

  describe('findCommitment', () => {
    it('should return single commitment', async () => {
      authServiceMock.canRead.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({ id: followUpId });
      prismaMock.commitment.findFirst.mockResolvedValue({
        id: 'commit-1',
        followUpId,
        description: 'Test',
      });

      const result = await service.findCommitment(
        institutionId,
        followUpId,
        'commit-1',
        userId,
      );

      expect(result.id).toBe('commit-1');
    });

    it('should return 404 for non-existent commitment', async () => {
      authServiceMock.canRead.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({ id: followUpId });
      prismaMock.commitment.findFirst.mockResolvedValue(null);

      await expect(
        service.findCommitment(
          institutionId,
          followUpId,
          'commit-nonexistent',
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCommitment', () => {
    it('should update commitment status', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.commitment.findFirst.mockResolvedValue({
        id: 'commit-1',
        followUpId,
        status: CommitmentStatus.PENDING,
      });
      prismaMock.commitment.update.mockResolvedValue({
        id: 'commit-1',
        status: CommitmentStatus.COMPLETED,
        completedAt: new Date(),
      });

      const result = await service.updateCommitment(
        institutionId,
        followUpId,
        'commit-1',
        { status: CommitmentStatus.COMPLETED },
        userId,
      );

      expect(result.status).toBe(CommitmentStatus.COMPLETED);
    });

    it('should reject update for non-existent commitment', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.commitment.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCommitment(
          institutionId,
          followUpId,
          'commit-nonexistent',
          { status: CommitmentStatus.COMPLETED },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject update with non-existent responsible user', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.commitment.findFirst.mockResolvedValue({
        id: 'commit-1',
        followUpId,
      });
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCommitment(
          institutionId,
          followUpId,
          'commit-1',
          { responsibleUserId: 'nonexistent' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // ATTACHMENTS TESTS
  // ============================================================

  describe('createAttachment', () => {
    const fileAssetId = '00000000-0000-0000-0000-000000000020';

    it('should create attachment for ADMIN', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.fileAsset.findFirst.mockResolvedValue({
        id: fileAssetId,
        originalName: 'report.pdf',
      });
      prismaMock.followUpAttachment.findUnique.mockResolvedValue(null);
      prismaMock.followUpAttachment.create.mockResolvedValue({
        id: 'att-1',
        followUpId,
        fileAssetId,
        institutionId,
        fileAsset: { id: fileAssetId, originalName: 'report.pdf' },
      });

      const result = await service.createAttachment(
        institutionId,
        followUpId,
        { fileAssetId },
        userId,
      );

      expect(result.fileAssetId).toBe(fileAssetId);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STUDENT_FOLLOW_UP_ATTACHMENT_ADDED' }),
      );
    });

    it('should reject duplicate attachment', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.fileAsset.findFirst.mockResolvedValue({
        id: fileAssetId,
        originalName: 'report.pdf',
      });
      prismaMock.followUpAttachment.findUnique.mockResolvedValue({
        id: 'existing-att',
      });

      await expect(
        service.createAttachment(
          institutionId,
          followUpId,
          { fileAssetId },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject attachment with non-existent file', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.fileAsset.findFirst.mockResolvedValue(null);

      await expect(
        service.createAttachment(
          institutionId,
          followUpId,
          { fileAssetId: 'nonexistent' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject attachment on CLOSED follow-up', async () => {
      authServiceMock.canUpdate.mockResolvedValue({
        allowed: false,
        reason: 'RECORD_CLOSED',
      });

      await expect(
        service.createAttachment(
          institutionId,
          followUpId,
          { fileAssetId },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAttachments', () => {
    it('should return attachments for authorized user', async () => {
      authServiceMock.canRead.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({ id: followUpId });
      prismaMock.followUpAttachment.findMany.mockResolvedValue([
        { id: 'att-1', followUpId, fileAssetId: 'file-1' },
      ]);

      const result = await service.findAttachments(
        institutionId,
        followUpId,
        userId,
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('removeAttachment', () => {
    it('should remove attachment for ADMIN', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.followUpAttachment.findFirst.mockResolvedValue({
        id: 'att-1',
        followUpId,
        fileAssetId: 'file-1',
        fileAsset: { originalName: 'report.pdf' },
      });
      prismaMock.followUpAttachment.delete.mockResolvedValue({});

      const result = await service.removeAttachment(
        institutionId,
        followUpId,
        'att-1',
        userId,
      );

      expect(result.success).toBe(true);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STUDENT_FOLLOW_UP_ATTACHMENT_REMOVED' }),
      );
    });

    it('should reject removal for non-existent attachment', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.followUpAttachment.findFirst.mockResolvedValue(null);

      await expect(
        service.removeAttachment(
          institutionId,
          followUpId,
          'att-nonexistent',
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // LIFECYCLE TESTS
  // ============================================================

  describe('escalate', () => {
    it('should escalate from OPEN to ESCALATED', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.studentFollowUp.update.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.ESCALATED,
      });

      const result = await service.escalate(
        institutionId,
        followUpId,
        userId,
      );

      expect(result.status).toBe(FollowUpStatus.ESCALATED);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STUDENT_FOLLOW_UP_ESCALATED' }),
      );
    });

    it('should reject escalate from CLOSED', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.CLOSED,
      });

      await expect(
        service.escalate(institutionId, followUpId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject escalate for SUPER_ADMIN', async () => {
      authServiceMock.canUpdate.mockResolvedValue({
        allowed: false,
        reason: 'SUPER_ADMIN_NO_ACCESS',
      });

      await expect(
        service.escalate(institutionId, followUpId, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('followUp', () => {
    it('should transition from ESCALATED to IN_PROGRESS', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.ESCALATED,
      });
      prismaMock.studentFollowUp.update.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.IN_PROGRESS,
      });

      const result = await service.followUp(
        institutionId,
        followUpId,
        userId,
      );

      expect(result.status).toBe(FollowUpStatus.IN_PROGRESS);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STUDENT_FOLLOW_UP_FOLLOW_UP' }),
      );
    });

    it('should transition from OPEN to IN_PROGRESS', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.studentFollowUp.update.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.IN_PROGRESS,
      });

      const result = await service.followUp(
        institutionId,
        followUpId,
        userId,
      );

      expect(result.status).toBe(FollowUpStatus.IN_PROGRESS);
    });

    it('should reject transition from CLOSED', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.CLOSED,
      });

      await expect(
        service.followUp(institutionId, followUpId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolve', () => {
    it('should resolve from IN_PROGRESS', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.IN_PROGRESS,
      });
      prismaMock.studentFollowUp.update.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.RESOLVED,
      });

      const result = await service.resolve(
        institutionId,
        followUpId,
        userId,
      );

      expect(result.status).toBe(FollowUpStatus.RESOLVED);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STUDENT_FOLLOW_UP_RESOLVED' }),
      );
    });

    it('should reject resolve from OPEN', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });

      await expect(
        service.resolve(institutionId, followUpId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reopen', () => {
    it('should reopen CLOSED record for ADMIN', async () => {
      authServiceMock.canManage = jest.fn().mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.CLOSED,
        closedAt: new Date(),
        closedById: userId,
      });
      prismaMock.studentFollowUp.update.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.IN_PROGRESS,
        closedAt: null,
        closedById: null,
      });

      const result = await service.reopen(
        institutionId,
        followUpId,
        userId,
      );

      expect(result.status).toBe(FollowUpStatus.IN_PROGRESS);
      expect(result.closedAt).toBeNull();
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STUDENT_FOLLOW_UP_REOPENED' }),
      );
    });

    it('should reject reopen for non-ADMIN', async () => {
      authServiceMock.canManage = jest.fn().mockResolvedValue({
        allowed: false,
        reason: 'INSUFFICIENT_PERMISSIONS',
      });

      await expect(
        service.reopen(institutionId, followUpId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject reopen for non-CLOSED record', async () => {
      authServiceMock.canManage = jest.fn().mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        institutionId,
        status: FollowUpStatus.OPEN,
      });

      await expect(
        service.reopen(institutionId, followUpId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject reopen for SUPER_ADMIN', async () => {
      authServiceMock.canManage = jest.fn().mockResolvedValue({
        allowed: false,
        reason: 'SUPER_ADMIN_NO_ACCESS',
      });

      await expect(
        service.reopen(institutionId, followUpId, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // LIFECYCLE VALIDATION TESTS
  // ============================================================

  describe('lifecycle transitions validation', () => {
    it('should allow OPEN → ESCALATED', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.OPEN,
      });
      prismaMock.studentFollowUp.update.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.ESCALATED,
      });

      await expect(
        service.escalate(institutionId, followUpId, userId),
      ).resolves.toBeDefined();
    });

    it('should allow ESCALATED → IN_PROGRESS', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.ESCALATED,
      });
      prismaMock.studentFollowUp.update.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.IN_PROGRESS,
      });

      await expect(
        service.followUp(institutionId, followUpId, userId),
      ).resolves.toBeDefined();
    });

    it('should allow IN_PROGRESS → RESOLVED', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.IN_PROGRESS,
      });
      prismaMock.studentFollowUp.update.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.RESOLVED,
      });

      await expect(
        service.resolve(institutionId, followUpId, userId),
      ).resolves.toBeDefined();
    });

    it('should reject CLOSED → IN_PROGRESS via followUp (use reopen instead)', async () => {
      authServiceMock.canUpdate.mockResolvedValue({ allowed: true });
      prismaMock.studentFollowUp.findFirst.mockResolvedValue({
        id: followUpId,
        status: FollowUpStatus.CLOSED,
      });

      await expect(
        service.followUp(institutionId, followUpId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
