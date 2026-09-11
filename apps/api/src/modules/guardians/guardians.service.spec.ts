import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { GuardiansService } from './guardians.service';
import { RelationshipType, GuardianStudentStatus } from '@prisma/client';
import { getUserRoleNames, hasFullAccess } from '../../common/auth/academic-scope';

jest.mock('../../common/auth/academic-scope', () => ({
  getUserRoleNames: jest.fn(),
  hasFullAccess: jest.fn(),
  FULL_ACCESS_ROLES: new Set(),
  TEACHER_SCOPED_ROLES: new Set(),
  resolveAccessibleStudentIds: jest.fn(),
  resolveAccessibleCourseIds: jest.fn(),
}));

const mockedGetUserRoleNames = jest.mocked(getUserRoleNames);
const mockedHasFullAccess = jest.mocked(hasFullAccess);

describe('GuardiansService', () => {
  let service: GuardiansService;
  let prismaMock: {
    student: {
      findFirst: jest.Mock;
    };
    userInstitution: {
      findFirst: jest.Mock;
    };
    guardianStudent: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditServiceMock: { log: jest.Mock };

  const institutionId = 'inst-1';
  const guardianUserId = 'guardian-1';
  const studentId = 'student-1';
  const performingUserId = 'user-1';

  beforeEach(() => {
    prismaMock = {
      student: {
        findFirst: jest.fn(),
      },
      userInstitution: {
        findFirst: jest.fn(),
      },
      guardianStudent: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    auditServiceMock = { log: jest.fn() };

    service = new GuardiansService(prismaMock as never, auditServiceMock as never);

    mockedGetUserRoleNames.mockReset();
    mockedHasFullAccess.mockReset();
    // Default: administrative performer.
    mockedGetUserRoleNames.mockResolvedValue(['INSTITUTION_ADMIN']);
    mockedHasFullAccess.mockReturnValue(true);
  });

  describe('linkStudent', () => {
    it('should link a guardian to a student successfully', async () => {
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId, institutionId });
      prismaMock.userInstitution.findFirst.mockResolvedValue({
        userId: guardianUserId,
        institutionId,
        status: 'ACTIVE',
      });
      prismaMock.guardianStudent.findUnique.mockResolvedValue(null);
      prismaMock.guardianStudent.create.mockResolvedValue({
        id: 'gs-1',
        institutionId,
        guardianUserId,
        studentId,
        relationshipType: RelationshipType.FATHER,
        isPrimary: true,
        status: GuardianStudentStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.linkStudent(
        institutionId,
        guardianUserId,
        { studentId, relationshipType: RelationshipType.FATHER, isPrimary: true },
        performingUserId,
      );

      expect(result.institutionId).toBe(institutionId);
      expect(result.guardianUserId).toBe(guardianUserId);
      expect(result.studentId).toBe(studentId);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GUARDIAN_LINKED',
          institutionId,
          userId: performingUserId,
        }),
      );
    });

    it('should throw NotFoundException for student not in same tenant', async () => {
      prismaMock.student.findFirst.mockResolvedValue(null);

      await expect(
        service.linkStudent(
          institutionId,
          guardianUserId,
          { studentId: 'other-tenant-student', relationshipType: RelationshipType.FATHER },
          performingUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when guardian is not in the institution', async () => {
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId, institutionId });
      prismaMock.userInstitution.findFirst.mockResolvedValue(null);

      await expect(
        service.linkStudent(
          institutionId,
          guardianUserId,
          { studentId, relationshipType: RelationshipType.FATHER },
          performingUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException for duplicate link', async () => {
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId, institutionId });
      prismaMock.userInstitution.findFirst.mockResolvedValue({
        userId: guardianUserId,
        institutionId,
        status: 'ACTIVE',
      });
      prismaMock.guardianStudent.findUnique.mockResolvedValue({
        id: 'existing',
        institutionId,
        guardianUserId,
        studentId,
      });

      await expect(
        service.linkStudent(
          institutionId,
          guardianUserId,
          { studentId, relationshipType: RelationshipType.FATHER },
          performingUserId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when non-admin links another guardian user', async () => {
      mockedGetUserRoleNames.mockResolvedValue(['PARENT']);
      mockedHasFullAccess.mockReturnValue(false);
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId, institutionId });

      await expect(
        service.linkStudent(
          institutionId,
          'other-guardian',
          { studentId, relationshipType: RelationshipType.FATHER },
          performingUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findStudentsByGuardian', () => {
    it('should return only linked students for the guardian', async () => {
      prismaMock.guardianStudent.findMany.mockResolvedValue([
        { id: 'gs-1', institutionId, guardianUserId, studentId, student: { id: studentId } },
      ]);
      prismaMock.guardianStudent.count.mockResolvedValue(1);

      const result = await service.findStudentsByGuardian(institutionId, guardianUserId, {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prismaMock.guardianStudent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId, guardianUserId, status: 'ACTIVE' }),
        }),
      );
    });

    it('should apply pagination', async () => {
      prismaMock.guardianStudent.findMany.mockResolvedValue([]);
      prismaMock.guardianStudent.count.mockResolvedValue(0);

      const result = await service.findStudentsByGuardian(institutionId, guardianUserId, {
        page: 2,
        limit: 10,
      });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(prismaMock.guardianStudent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by search term within tenant', async () => {
      prismaMock.guardianStudent.findMany.mockResolvedValue([]);
      prismaMock.guardianStudent.count.mockResolvedValue(0);

      await service.findStudentsByGuardian(institutionId, guardianUserId, { search: 'Lucía' });

      expect(prismaMock.guardianStudent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student: expect.objectContaining({ OR: expect.any(Array) }),
          }),
        }),
      );
    });

    it('should be tenant-scoped', async () => {
      prismaMock.guardianStudent.findMany.mockResolvedValue([]);
      prismaMock.guardianStudent.count.mockResolvedValue(0);

      await service.findStudentsByGuardian('other-tenant', guardianUserId, {});

      expect(prismaMock.guardianStudent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId: 'other-tenant' }),
        }),
      );
    });
  });

  describe('findByStudent', () => {
    it('should return guardians for a student', async () => {
      prismaMock.student.findFirst.mockResolvedValue({ id: studentId, institutionId });
      prismaMock.guardianStudent.findMany.mockResolvedValue([
        { id: 'gs-1', institutionId, guardianUserId, studentId },
      ]);

      const result = await service.findByStudent(institutionId, studentId);

      expect(result).toHaveLength(1);
      expect(prismaMock.guardianStudent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { institutionId, studentId, status: 'ACTIVE' },
        }),
      );
    });

    it('should throw NotFoundException for cross-tenant student', async () => {
      prismaMock.student.findFirst.mockResolvedValue(null);

      await expect(service.findByStudent(institutionId, 'other-tenant-student')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unlinkStudent', () => {
    it('should unlink a guardian from a student', async () => {
      prismaMock.guardianStudent.findUnique.mockResolvedValue({
        id: 'gs-1',
        institutionId,
        guardianUserId,
        studentId,
        status: GuardianStudentStatus.ACTIVE,
      });
      prismaMock.guardianStudent.update.mockResolvedValue({
        id: 'gs-1',
        institutionId,
        guardianUserId,
        studentId,
        status: GuardianStudentStatus.INACTIVE,
      });

      const result = await service.unlinkStudent(
        institutionId,
        guardianUserId,
        studentId,
        performingUserId,
      );

      expect(result.status).toBe(GuardianStudentStatus.INACTIVE);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GUARDIAN_UNLINKED',
          institutionId,
          userId: performingUserId,
        }),
      );
    });

    it('should throw NotFoundException for non-existent link', async () => {
      prismaMock.guardianStudent.findUnique.mockResolvedValue(null);

      await expect(
        service.unlinkStudent(institutionId, guardianUserId, studentId, performingUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for already inactive link', async () => {
      prismaMock.guardianStudent.findUnique.mockResolvedValue({
        id: 'gs-1',
        institutionId,
        guardianUserId,
        studentId,
        status: GuardianStudentStatus.INACTIVE,
      });

      await expect(
        service.unlinkStudent(institutionId, guardianUserId, studentId, performingUserId),
      ).rejects.toThrow(ConflictException);
    });

    it('should be tenant-scoped', async () => {
      prismaMock.guardianStudent.findUnique.mockResolvedValue(null);

      await expect(
        service.unlinkStudent('other-tenant', guardianUserId, studentId, performingUserId),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.guardianStudent.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            institutionId_guardianUserId_studentId: {
              institutionId: 'other-tenant',
              guardianUserId,
              studentId,
            },
          },
        }),
      );
    });
  });
});
