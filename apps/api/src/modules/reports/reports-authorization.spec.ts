import { ReportsAuthorizationService } from './reports-authorization';

describe('ReportsAuthorizationService', () => {
  let service: ReportsAuthorizationService;
  let prismaMock: {
    teacherAssignment: { findFirst: jest.Mock };
    enrollment: { findFirst: jest.Mock };
    guardianStudent: { findUnique: jest.Mock; findFirst: jest.Mock };
    student: { findUnique: jest.Mock };
    globalUserRole: { findFirst: jest.Mock };
  };
  let authorizationServiceMock: {
    getGlobalPermissionCodes: jest.Mock;
    getUserRoles: jest.Mock;
  };

  const institutionId = 'inst-1';
  const userId = 'user-1';
  const studentId = 'student-1';
  const courseId = 'course-1';
  const periodId = 'period-1';

  beforeEach(() => {
    prismaMock = {
      teacherAssignment: { findFirst: jest.fn() },
      enrollment: { findFirst: jest.fn() },
      guardianStudent: { findUnique: jest.fn(), findFirst: jest.fn() },
      student: { findUnique: jest.fn() },
      globalUserRole: { findFirst: jest.fn() },
    };
    authorizationServiceMock = {
      getGlobalPermissionCodes: jest.fn(),
      getUserRoles: jest.fn(),
    };

    service = new ReportsAuthorizationService(
      prismaMock as never,
      authorizationServiceMock as never,
    );
  });

  const roles = (names: string[]) => names.map((n) => ({ name: n, roleType: 'TENANT' }));

  describe('getUserRole', () => {
    it('should return SUPER_ADMIN for a user with a global role and no tenant role', async () => {
      authorizationServiceMock.getGlobalPermissionCodes.mockResolvedValue(['any:read']);
      authorizationServiceMock.getUserRoles.mockResolvedValue([]);
      prismaMock.globalUserRole.findFirst.mockResolvedValue({ id: 'global' });
      expect(await service.getUserRole(userId, institutionId)).toBe('SUPER_ADMIN');
    });

    it('should prefer INSTITUTION_ADMIN over other tenant roles', async () => {
      authorizationServiceMock.getGlobalPermissionCodes.mockResolvedValue([]);
      authorizationServiceMock.getUserRoles.mockResolvedValue(
        roles(['TEACHER', 'INSTITUTION_ADMIN']),
      );
      expect(await service.getUserRole(userId, institutionId)).toBe('INSTITUTION_ADMIN');
    });

    it('should return null when there are no roles', async () => {
      authorizationServiceMock.getGlobalPermissionCodes.mockResolvedValue([]);
      authorizationServiceMock.getUserRoles.mockResolvedValue([]);
      expect(await service.getUserRole(userId, institutionId)).toBeNull();
    });
  });

  describe('canAccessStudent', () => {
    it('should allow INSTITUTION_ADMIN without queries', async () => {
      const res = await service.canAccessStudent(
        userId,
        institutionId,
        studentId,
        null,
        'INSTITUTION_ADMIN',
      );
      expect(res.allowed).toBe(true);
      expect(prismaMock.teacherAssignment.findFirst).not.toHaveBeenCalled();
    });

    it('should deny SUPER_ADMIN (no bypass)', async () => {
      const res = await service.canAccessStudent(
        userId,
        institutionId,
        studentId,
        null,
        'SUPER_ADMIN',
      );
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('SUPER_ADMIN_NO_ACCESS');
    });

    it('should allow TEACHER with ACTIVE assignment to a course the student is enrolled in', async () => {
      prismaMock.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });
      const res = await service.canAccessStudent(
        userId,
        institutionId,
        studentId,
        periodId,
        'TEACHER',
      );
      expect(res.allowed).toBe(true);
    });

    it('should deny TEACHER without relationship (IDOR)', async () => {
      prismaMock.teacherAssignment.findFirst.mockResolvedValue(null);
      const res = await service.canAccessStudent(
        userId,
        institutionId,
        studentId,
        periodId,
        'TEACHER',
      );
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('NO_STUDENT_RELATIONSHIP');
    });

    it('should allow PARENT linked to the student', async () => {
      prismaMock.guardianStudent.findUnique.mockResolvedValue({ id: 'gs-1', status: 'ACTIVE' });
      const res = await service.canAccessStudent(userId, institutionId, studentId, null, 'PARENT');
      expect(res.allowed).toBe(true);
    });

    it('should deny PARENT on unlinked student (IDOR)', async () => {
      prismaMock.guardianStudent.findUnique.mockResolvedValue(null);
      const res = await service.canAccessStudent(userId, institutionId, studentId, null, 'PARENT');
      expect(res.allowed).toBe(false);
    });

    it('should allow STUDENT on own record', async () => {
      prismaMock.student.findUnique.mockResolvedValue({ userId, institutionId });
      const res = await service.canAccessStudent(userId, institutionId, studentId, null, 'STUDENT');
      expect(res.allowed).toBe(true);
    });

    it('should deny STUDENT on another student record (IDOR)', async () => {
      prismaMock.student.findUnique.mockResolvedValue({ userId: 'other', institutionId });
      const res = await service.canAccessStudent(userId, institutionId, studentId, null, 'STUDENT');
      expect(res.allowed).toBe(false);
    });

    it('should deny STUDENT on cross-tenant record', async () => {
      prismaMock.student.findUnique.mockResolvedValue({ userId, institutionId: 'other-inst' });
      const res = await service.canAccessStudent(userId, institutionId, studentId, null, 'STUDENT');
      expect(res.allowed).toBe(false);
    });
  });

  describe('canAccessCourse', () => {
    it('should allow INSTITUTION_ADMIN without queries', async () => {
      const res = await service.canAccessCourse(
        userId,
        institutionId,
        courseId,
        null,
        'INSTITUTION_ADMIN',
      );
      expect(res.allowed).toBe(true);
    });

    it('should deny SUPER_ADMIN', async () => {
      const res = await service.canAccessCourse(
        userId,
        institutionId,
        courseId,
        null,
        'SUPER_ADMIN',
      );
      expect(res.allowed).toBe(false);
    });

    it('should allow TEACHER assigned to the course and period', async () => {
      prismaMock.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });
      const res = await service.canAccessCourse(
        userId,
        institutionId,
        courseId,
        periodId,
        'TEACHER',
      );
      expect(res.allowed).toBe(true);
    });

    it('should deny TEACHER on unassigned course', async () => {
      prismaMock.teacherAssignment.findFirst.mockResolvedValue(null);
      const res = await service.canAccessCourse(
        userId,
        institutionId,
        courseId,
        periodId,
        'TEACHER',
      );
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('NO_COURSE_RELATIONSHIP');
    });

    it('should allow PARENT whose child is enrolled in the course', async () => {
      prismaMock.guardianStudent.findFirst.mockResolvedValue({ id: 'gs-1' });
      const res = await service.canAccessCourse(
        userId,
        institutionId,
        courseId,
        periodId,
        'PARENT',
      );
      expect(res.allowed).toBe(true);
    });

    it('should allow STUDENT enrolled in the course', async () => {
      prismaMock.enrollment.findFirst.mockResolvedValue({ id: 'enr-1' });
      const res = await service.canAccessCourse(
        userId,
        institutionId,
        courseId,
        periodId,
        'STUDENT',
      );
      expect(res.allowed).toBe(true);
    });

    it('should deny STUDENT not enrolled (IDOR)', async () => {
      prismaMock.enrollment.findFirst.mockResolvedValue(null);
      const res = await service.canAccessCourse(
        userId,
        institutionId,
        courseId,
        periodId,
        'STUDENT',
      );
      expect(res.allowed).toBe(false);
    });
  });
});
