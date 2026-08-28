import { StudentFollowUpAuthorizationService } from './student-follow-up-authorization';
import { FollowUpConfidentiality, FollowUpStatus } from '@prisma/client';

describe('StudentFollowUpAuthorizationService', () => {
  let service: StudentFollowUpAuthorizationService;
  let prismaMock: {
    studentFollowUp: { findUnique: jest.Mock };
    userInstitution: { findUnique: jest.Mock };
    teacherAssignment: { findFirst: jest.Mock };
    guardianStudent: { findUnique: jest.Mock };
    student: { findUnique: jest.Mock };
    globalUserRole: { findFirst: jest.Mock };
  };
  let authzServiceMock: {
    getUserRoles: jest.Mock;
    getGlobalPermissionCodes: jest.Mock;
  };

  const INSTITUTION_ID = 'inst-1';
  const FOLLOW_UP_ID = 'fu-1';
  const STUDENT_ID = 'student-1';
  const USER_ID = 'user-1';

  beforeEach(() => {
    prismaMock = {
      studentFollowUp: { findUnique: jest.fn() },
      userInstitution: { findUnique: jest.fn() },
      teacherAssignment: { findFirst: jest.fn() },
      guardianStudent: { findUnique: jest.fn() },
      student: { findUnique: jest.fn() },
      globalUserRole: { findFirst: jest.fn() },
    };
    authzServiceMock = {
      getUserRoles: jest.fn(),
      getGlobalPermissionCodes: jest.fn(),
    };

    service = new StudentFollowUpAuthorizationService(
      prismaMock as never,
      authzServiceMock as never,
    );
  });

  function mockTenantRole(roleName: string) {
    authzServiceMock.getGlobalPermissionCodes.mockResolvedValue([]);
    authzServiceMock.getUserRoles.mockResolvedValue([
      { id: 'r1', name: roleName, roleType: 'TENANT' },
    ]);
  }

  function mockSuperAdmin() {
    authzServiceMock.getGlobalPermissionCodes.mockResolvedValue(['institution:read']);
    authzServiceMock.getUserRoles.mockResolvedValue([]);
    prismaMock.globalUserRole.findFirst.mockResolvedValue({ id: 'gur-1' });
  }

  describe('canRead', () => {
    it('should deny SUPER_ADMIN access', async () => {
      mockSuperAdmin();

      const result = await service.canRead(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('SUPER_ADMIN_NO_ACCESS');
    });

    it('should allow INSTITUTION_ADMIN to read PUBLIC follow-up', async () => {
      mockTenantRole('INSTITUTION_ADMIN');
      prismaMock.studentFollowUp.findUnique.mockResolvedValue({
        id: FOLLOW_UP_ID,
        institutionId: INSTITUTION_ID,
        studentId: STUDENT_ID,
        confidentiality: FollowUpConfidentiality.PUBLIC,
      });

      const result = await service.canRead(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(true);
    });

    it('should allow INSTITUTION_ADMIN to read SENSITIVE follow-up', async () => {
      mockTenantRole('INSTITUTION_ADMIN');
      prismaMock.studentFollowUp.findUnique.mockResolvedValue({
        id: FOLLOW_UP_ID,
        institutionId: INSTITUTION_ID,
        studentId: STUDENT_ID,
        confidentiality: FollowUpConfidentiality.SENSITIVE,
      });

      const result = await service.canRead(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(true);
    });

    it('should deny TEACHER access to unassigned student', async () => {
      mockTenantRole('TEACHER');
      prismaMock.studentFollowUp.findUnique.mockResolvedValue({
        id: FOLLOW_UP_ID,
        institutionId: INSTITUTION_ID,
        studentId: STUDENT_ID,
        confidentiality: FollowUpConfidentiality.PUBLIC,
      });
      prismaMock.teacherAssignment.findFirst.mockResolvedValue(null);

      const result = await service.canRead(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_STUDENT_RELATIONSHIP');
    });

    it('should allow TEACHER to read follow-up for assigned student', async () => {
      mockTenantRole('TEACHER');
      prismaMock.studentFollowUp.findUnique.mockResolvedValue({
        id: FOLLOW_UP_ID,
        institutionId: INSTITUTION_ID,
        studentId: STUDENT_ID,
        confidentiality: FollowUpConfidentiality.PUBLIC,
      });
      prismaMock.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });

      const result = await service.canRead(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(true);
    });

    it('should deny TEACHER CONFIDENTIAL even for assigned student', async () => {
      mockTenantRole('TEACHER');
      prismaMock.studentFollowUp.findUnique.mockResolvedValue({
        id: FOLLOW_UP_ID,
        institutionId: INSTITUTION_ID,
        studentId: STUDENT_ID,
        confidentiality: FollowUpConfidentiality.CONFIDENTIAL,
      });
      prismaMock.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });

      const result = await service.canRead(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('CONFIDENTIALITY_RESTRICTED');
    });

    it('should deny PARENT access to unlinked student', async () => {
      mockTenantRole('PARENT');
      prismaMock.studentFollowUp.findUnique.mockResolvedValue({
        id: FOLLOW_UP_ID,
        institutionId: INSTITUTION_ID,
        studentId: STUDENT_ID,
        confidentiality: FollowUpConfidentiality.PUBLIC,
      });
      prismaMock.guardianStudent.findUnique.mockResolvedValue(null);

      const result = await service.canRead(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_STUDENT_RELATIONSHIP');
    });

    it('should allow PARENT to read follow-up for linked student', async () => {
      mockTenantRole('PARENT');
      prismaMock.studentFollowUp.findUnique.mockResolvedValue({
        id: FOLLOW_UP_ID,
        institutionId: INSTITUTION_ID,
        studentId: STUDENT_ID,
        confidentiality: FollowUpConfidentiality.PUBLIC,
      });
      prismaMock.guardianStudent.findUnique.mockResolvedValue({ id: 'gs-1' });

      const result = await service.canRead(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(true);
    });

    it('should deny STUDENT access to other student follow-up', async () => {
      mockTenantRole('STUDENT');
      prismaMock.studentFollowUp.findUnique.mockResolvedValue({
        id: FOLLOW_UP_ID,
        institutionId: INSTITUTION_ID,
        studentId: STUDENT_ID,
        confidentiality: FollowUpConfidentiality.PUBLIC,
      });
      prismaMock.student.findUnique.mockResolvedValue({
        id: STUDENT_ID,
        userId: 'other-user',
        institutionId: INSTITUTION_ID,
      });

      const result = await service.canRead(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_STUDENT_RELATIONSHIP');
    });

    it('should allow STUDENT to read own follow-up', async () => {
      mockTenantRole('STUDENT');
      prismaMock.studentFollowUp.findUnique.mockResolvedValue({
        id: FOLLOW_UP_ID,
        institutionId: INSTITUTION_ID,
        studentId: STUDENT_ID,
        confidentiality: FollowUpConfidentiality.PUBLIC,
      });
      prismaMock.student.findUnique.mockResolvedValue({
        id: STUDENT_ID,
        userId: USER_ID,
        institutionId: INSTITUTION_ID,
      });

      const result = await service.canRead(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(true);
    });

    it('should deny access to follow-up in different institution', async () => {
      mockTenantRole('INSTITUTION_ADMIN');
      prismaMock.studentFollowUp.findUnique.mockResolvedValue({
        id: FOLLOW_UP_ID,
        institutionId: 'inst-other',
        studentId: STUDENT_ID,
        confidentiality: FollowUpConfidentiality.PUBLIC,
      });

      const result = await service.canRead(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NOT_FOUND');
    });

    it('should deny access to non-existent follow-up', async () => {
      mockTenantRole('INSTITUTION_ADMIN');
      prismaMock.studentFollowUp.findUnique.mockResolvedValue(null);

      const result = await service.canRead(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NOT_FOUND');
    });

    it('should deny user with no role', async () => {
      authzServiceMock.getGlobalPermissionCodes.mockResolvedValue([]);
      authzServiceMock.getUserRoles.mockResolvedValue([]);

      const result = await service.canRead(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_ROLE');
    });
  });

  describe('canCreate', () => {
    it('should deny SUPER_ADMIN', async () => {
      mockSuperAdmin();

      const result = await service.canCreate(USER_ID, INSTITUTION_ID, STUDENT_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('SUPER_ADMIN_NO_ACCESS');
    });

    it('should deny PARENT', async () => {
      mockTenantRole('PARENT');

      const result = await service.canCreate(USER_ID, INSTITUTION_ID, STUDENT_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should deny STUDENT', async () => {
      mockTenantRole('STUDENT');

      const result = await service.canCreate(USER_ID, INSTITUTION_ID, STUDENT_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow INSTITUTION_ADMIN', async () => {
      mockTenantRole('INSTITUTION_ADMIN');
      prismaMock.userInstitution.findUnique.mockResolvedValue({ id: 'ui-1' });

      const result = await service.canCreate(USER_ID, INSTITUTION_ID, STUDENT_ID);

      expect(result.allowed).toBe(true);
    });

    it('should allow TEACHER for assigned student', async () => {
      mockTenantRole('TEACHER');
      prismaMock.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });

      const result = await service.canCreate(USER_ID, INSTITUTION_ID, STUDENT_ID);

      expect(result.allowed).toBe(true);
    });

    it('should deny TEACHER for unassigned student', async () => {
      mockTenantRole('TEACHER');
      prismaMock.teacherAssignment.findFirst.mockResolvedValue(null);

      const result = await service.canCreate(USER_ID, INSTITUTION_ID, STUDENT_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_STUDENT_RELATIONSHIP');
    });
  });

  describe('canUpdate', () => {
    it('should deny SUPER_ADMIN', async () => {
      mockSuperAdmin();

      const result = await service.canUpdate(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(false);
    });

    it('should deny PARENT', async () => {
      mockTenantRole('PARENT');

      const result = await service.canUpdate(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(false);
    });

    it('should deny update on CLOSED record', async () => {
      mockTenantRole('INSTITUTION_ADMIN');
      prismaMock.studentFollowUp.findUnique.mockResolvedValue({
        id: FOLLOW_UP_ID,
        institutionId: INSTITUTION_ID,
        studentId: STUDENT_ID,
        status: FollowUpStatus.CLOSED,
      });

      const result = await service.canUpdate(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('RECORD_CLOSED');
    });

    it('should allow INSTITUTION_ADMIN to update OPEN record', async () => {
      mockTenantRole('INSTITUTION_ADMIN');
      prismaMock.userInstitution.findUnique.mockResolvedValue({ id: 'ui-1' });
      prismaMock.studentFollowUp.findUnique.mockResolvedValue({
        id: FOLLOW_UP_ID,
        institutionId: INSTITUTION_ID,
        studentId: STUDENT_ID,
        status: FollowUpStatus.OPEN,
      });

      const result = await service.canUpdate(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(true);
    });
  });

  describe('canClose', () => {
    it('should deny already CLOSED record', async () => {
      mockTenantRole('INSTITUTION_ADMIN');
      prismaMock.studentFollowUp.findUnique.mockResolvedValue({
        id: FOLLOW_UP_ID,
        institutionId: INSTITUTION_ID,
        studentId: STUDENT_ID,
        status: FollowUpStatus.CLOSED,
      });

      const result = await service.canClose(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('ALREADY_CLOSED');
    });

    it('should allow INSTITUTION_ADMIN to close OPEN record', async () => {
      mockTenantRole('INSTITUTION_ADMIN');
      prismaMock.userInstitution.findUnique.mockResolvedValue({ id: 'ui-1' });
      prismaMock.studentFollowUp.findUnique.mockResolvedValue({
        id: FOLLOW_UP_ID,
        institutionId: INSTITUTION_ID,
        studentId: STUDENT_ID,
        status: FollowUpStatus.OPEN,
      });

      const result = await service.canClose(USER_ID, INSTITUTION_ID, FOLLOW_UP_ID);

      expect(result.allowed).toBe(true);
    });
  });

  describe('canManage', () => {
    it('should allow INSTITUTION_ADMIN', async () => {
      mockTenantRole('INSTITUTION_ADMIN');

      const result = await service.canManage(USER_ID, INSTITUTION_ID);

      expect(result.allowed).toBe(true);
    });

    it('should deny TEACHER', async () => {
      mockTenantRole('TEACHER');

      const result = await service.canManage(USER_ID, INSTITUTION_ID);

      expect(result.allowed).toBe(false);
    });

    it('should deny SUPER_ADMIN', async () => {
      mockSuperAdmin();

      const result = await service.canManage(USER_ID, INSTITUTION_ID);

      expect(result.allowed).toBe(false);
    });
  });

  describe('canViewConfidentiality', () => {
    it('should allow INSTITUTION_ADMIN all levels', () => {
      expect(service.canViewConfidentiality('INSTITUTION_ADMIN', FollowUpConfidentiality.PUBLIC)).toBe(true);
      expect(service.canViewConfidentiality('INSTITUTION_ADMIN', FollowUpConfidentiality.INTERNAL)).toBe(true);
      expect(service.canViewConfidentiality('INSTITUTION_ADMIN', FollowUpConfidentiality.CONFIDENTIAL)).toBe(true);
      expect(service.canViewConfidentiality('INSTITUTION_ADMIN', FollowUpConfidentiality.SENSITIVE)).toBe(true);
    });

    it('should allow TEACHER only PUBLIC and INTERNAL', () => {
      expect(service.canViewConfidentiality('TEACHER', FollowUpConfidentiality.PUBLIC)).toBe(true);
      expect(service.canViewConfidentiality('TEACHER', FollowUpConfidentiality.INTERNAL)).toBe(true);
      expect(service.canViewConfidentiality('TEACHER', FollowUpConfidentiality.CONFIDENTIAL)).toBe(false);
      expect(service.canViewConfidentiality('TEACHER', FollowUpConfidentiality.SENSITIVE)).toBe(false);
    });

    it('should allow PARENT only PUBLIC and INTERNAL', () => {
      expect(service.canViewConfidentiality('PARENT', FollowUpConfidentiality.PUBLIC)).toBe(true);
      expect(service.canViewConfidentiality('PARENT', FollowUpConfidentiality.INTERNAL)).toBe(true);
      expect(service.canViewConfidentiality('PARENT', FollowUpConfidentiality.CONFIDENTIAL)).toBe(false);
      expect(service.canViewConfidentiality('PARENT', FollowUpConfidentiality.SENSITIVE)).toBe(false);
    });

    it('should allow STUDENT only PUBLIC and INTERNAL', () => {
      expect(service.canViewConfidentiality('STUDENT', FollowUpConfidentiality.PUBLIC)).toBe(true);
      expect(service.canViewConfidentiality('STUDENT', FollowUpConfidentiality.INTERNAL)).toBe(true);
      expect(service.canViewConfidentiality('STUDENT', FollowUpConfidentiality.CONFIDENTIAL)).toBe(false);
      expect(service.canViewConfidentiality('STUDENT', FollowUpConfidentiality.SENSITIVE)).toBe(false);
    });

    it('should deny SUPER_ADMIN all levels', () => {
      expect(service.canViewConfidentiality('SUPER_ADMIN', FollowUpConfidentiality.PUBLIC)).toBe(false);
      expect(service.canViewConfidentiality('SUPER_ADMIN', FollowUpConfidentiality.INTERNAL)).toBe(false);
      expect(service.canViewConfidentiality('SUPER_ADMIN', FollowUpConfidentiality.CONFIDENTIAL)).toBe(false);
      expect(service.canViewConfidentiality('SUPER_ADMIN', FollowUpConfidentiality.SENSITIVE)).toBe(false);
    });

    it('should deny unknown role', () => {
      expect(service.canViewConfidentiality('UNKNOWN', FollowUpConfidentiality.PUBLIC)).toBe(false);
    });
  });

  describe('getVisibleConfidentialityLevels', () => {
    it('should return all levels for INSTITUTION_ADMIN', () => {
      const levels = service.getVisibleConfidentialityLevels('INSTITUTION_ADMIN');
      expect(levels).toEqual([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
        FollowUpConfidentiality.CONFIDENTIAL,
        FollowUpConfidentiality.SENSITIVE,
      ]);
    });

    it('should return PUBLIC and INTERNAL for TEACHER', () => {
      const levels = service.getVisibleConfidentialityLevels('TEACHER');
      expect(levels).toEqual([
        FollowUpConfidentiality.PUBLIC,
        FollowUpConfidentiality.INTERNAL,
      ]);
    });

    it('should return empty array for SUPER_ADMIN', () => {
      const levels = service.getVisibleConfidentialityLevels('SUPER_ADMIN');
      expect(levels).toEqual([]);
    });
  });

  describe('buildListFilter', () => {
    it('should build institution-wide filter for INSTITUTION_ADMIN', () => {
      const filter = service.buildListFilter(USER_ID, INSTITUTION_ID, 'INSTITUTION_ADMIN');
      expect(filter).toEqual({ institutionId: INSTITUTION_ID });
    });

    it('should build teacher relationship filter for TEACHER', () => {
      const filter = service.buildListFilter(USER_ID, INSTITUTION_ID, 'TEACHER');
      expect(filter).toHaveProperty('institutionId', INSTITUTION_ID);
      expect(filter).toHaveProperty('student');
    });

    it('should build guardian filter for PARENT', () => {
      const filter = service.buildListFilter(USER_ID, INSTITUTION_ID, 'PARENT');
      expect(filter).toHaveProperty('institutionId', INSTITUTION_ID);
      expect(filter).toHaveProperty('student');
    });

    it('should build own-student filter for STUDENT', () => {
      const filter = service.buildListFilter(USER_ID, INSTITUTION_ID, 'STUDENT');
      expect(filter).toHaveProperty('institutionId', INSTITUTION_ID);
      expect(filter).toHaveProperty('student');
    });

    it('should build never-match filter for SUPER_ADMIN', () => {
      const filter = service.buildListFilter(USER_ID, INSTITUTION_ID, 'SUPER_ADMIN');
      expect(filter).toHaveProperty('id', '__NEVER_MATCH__');
    });
  });
});
