import { AttendanceAuthorizationService } from './attendance-authorization';

interface ListFilterShape {
  institutionId?: string;
  id?: string;
  course?: { teacherAssignments?: { some?: { teacherUserId?: string } } };
  student?: {
    guardianStudents?: { some?: { guardianUserId?: string } };
    user?: { id?: string };
  };
}

describe('AttendanceAuthorizationService', () => {
  let service: AttendanceAuthorizationService;
  let prismaMock: {
    teacherAssignment: { findFirst: jest.Mock };
    enrollment: { findFirst: jest.Mock };
    guardianStudent: { findUnique: jest.Mock };
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
  const attendance = { studentId, courseId, academicPeriodId: periodId };

  beforeEach(() => {
    prismaMock = {
      teacherAssignment: { findFirst: jest.fn() },
      enrollment: { findFirst: jest.fn() },
      guardianStudent: { findUnique: jest.fn() },
      student: { findUnique: jest.fn() },
      globalUserRole: { findFirst: jest.fn() },
    };
    authorizationServiceMock = {
      getGlobalPermissionCodes: jest.fn(),
      getUserRoles: jest.fn(),
    };

    service = new AttendanceAuthorizationService(
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

  describe('canCreate', () => {
    it('should allow INSTITUTION_ADMIN', async () => {
      const res = await service.canCreate(userId, institutionId, studentId, courseId, periodId, 'INSTITUTION_ADMIN');
      expect(res.allowed).toBe(true);
    });

    it('should deny SUPER_ADMIN', async () => {
      const res = await service.canCreate(userId, institutionId, studentId, courseId, periodId, 'SUPER_ADMIN');
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('SUPER_ADMIN_NO_ACCESS');
    });

    it('should deny PARENT', async () => {
      const res = await service.canCreate(userId, institutionId, studentId, courseId, periodId, 'PARENT');
      expect(res.allowed).toBe(false);
    });

    it('should deny STUDENT', async () => {
      const res = await service.canCreate(userId, institutionId, studentId, courseId, periodId, 'STUDENT');
      expect(res.allowed).toBe(false);
    });

    it('should allow TEACHER assigned to the course and period with student enrolled', async () => {
      prismaMock.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });
      prismaMock.enrollment.findFirst.mockResolvedValue({ id: 'enr-1' });
      const res = await service.canCreate(userId, institutionId, studentId, courseId, periodId, 'TEACHER');
      expect(res.allowed).toBe(true);
    });

    it('should deny TEACHER not assigned to the course', async () => {
      prismaMock.teacherAssignment.findFirst.mockResolvedValue(null);
      const res = await service.canCreate(userId, institutionId, studentId, courseId, periodId, 'TEACHER');
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('NO_COURSE_RELATIONSHIP');
    });

    it('should deny TEACHER when student is not enrolled', async () => {
      prismaMock.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });
      prismaMock.enrollment.findFirst.mockResolvedValue(null);
      const res = await service.canCreate(userId, institutionId, studentId, courseId, periodId, 'TEACHER');
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('NO_STUDENT_RELATIONSHIP');
    });
  });

  describe('canRead', () => {
    it('should allow INSTITUTION_ADMIN', async () => {
      const res = await service.canRead(userId, institutionId, attendance, 'INSTITUTION_ADMIN');
      expect(res.allowed).toBe(true);
    });

    it('should allow TEACHER assigned to the course', async () => {
      prismaMock.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });
      const res = await service.canRead(userId, institutionId, attendance, 'TEACHER');
      expect(res.allowed).toBe(true);
    });

    it('should deny TEACHER on unassigned course', async () => {
      prismaMock.teacherAssignment.findFirst.mockResolvedValue(null);
      const res = await service.canRead(userId, institutionId, attendance, 'TEACHER');
      expect(res.allowed).toBe(false);
    });

    it('should allow PARENT linked to the student', async () => {
      prismaMock.guardianStudent.findUnique.mockResolvedValue({ id: 'gs-1', status: 'ACTIVE' });
      const res = await service.canRead(userId, institutionId, attendance, 'PARENT');
      expect(res.allowed).toBe(true);
    });

    it('should deny PARENT on unlinked student (IDOR)', async () => {
      prismaMock.guardianStudent.findUnique.mockResolvedValue(null);
      const res = await service.canRead(userId, institutionId, attendance, 'PARENT');
      expect(res.allowed).toBe(false);
    });

    it('should allow STUDENT on own record', async () => {
      prismaMock.student.findUnique.mockResolvedValue({ userId, institutionId });
      const res = await service.canRead(userId, institutionId, attendance, 'STUDENT');
      expect(res.allowed).toBe(true);
    });

    it('should deny STUDENT on another student record (IDOR)', async () => {
      prismaMock.student.findUnique.mockResolvedValue({ userId: 'other', institutionId });
      const res = await service.canRead(userId, institutionId, attendance, 'STUDENT');
      expect(res.allowed).toBe(false);
    });

    it('should deny STUDENT on cross-tenant record', async () => {
      prismaMock.student.findUnique.mockResolvedValue({ userId, institutionId: 'other-inst' });
      const res = await service.canRead(userId, institutionId, attendance, 'STUDENT');
      expect(res.allowed).toBe(false);
    });

    it('should deny SUPER_ADMIN (no bypass)', async () => {
      const res = await service.canRead(userId, institutionId, attendance, 'SUPER_ADMIN');
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('SUPER_ADMIN_NO_ACCESS');
    });
  });

  describe('canModify', () => {
    it('should allow INSTITUTION_ADMIN', async () => {
      const res = await service.canModify(userId, institutionId, attendance, 'INSTITUTION_ADMIN');
      expect(res.allowed).toBe(true);
    });

    it('should allow TEACHER assigned to the course', async () => {
      prismaMock.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });
      const res = await service.canModify(userId, institutionId, attendance, 'TEACHER');
      expect(res.allowed).toBe(true);
    });

    it('should deny TEACHER on unassigned course', async () => {
      prismaMock.teacherAssignment.findFirst.mockResolvedValue(null);
      const res = await service.canModify(userId, institutionId, attendance, 'TEACHER');
      expect(res.allowed).toBe(false);
    });

    it('should deny PARENT and STUDENT', async () => {
      expect((await service.canModify(userId, institutionId, attendance, 'PARENT')).allowed).toBe(false);
      expect((await service.canModify(userId, institutionId, attendance, 'STUDENT')).allowed).toBe(false);
    });

    it('should deny SUPER_ADMIN', async () => {
      const res = await service.canModify(userId, institutionId, attendance, 'SUPER_ADMIN');
      expect(res.allowed).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('should allow INSTITUTION_ADMIN only', async () => {
      expect((await service.canDelete(userId, institutionId, attendance, 'INSTITUTION_ADMIN')).allowed).toBe(true);
      expect((await service.canDelete(userId, institutionId, attendance, 'TEACHER')).allowed).toBe(false);
      expect((await service.canDelete(userId, institutionId, attendance, 'PARENT')).allowed).toBe(false);
      expect((await service.canDelete(userId, institutionId, attendance, 'STUDENT')).allowed).toBe(false);
      expect((await service.canDelete(userId, institutionId, attendance, 'SUPER_ADMIN')).allowed).toBe(false);
    });
  });

  describe('buildListFilter', () => {
    it('should scope ADMIN to tenant', () => {
      expect(service.buildListFilter(userId, institutionId, 'INSTITUTION_ADMIN')).toEqual({
        institutionId,
      });
    });

    it('should scope TEACHER to assigned courses', () => {
      const filter = service.buildListFilter(userId, institutionId, 'TEACHER') as unknown as ListFilterShape;
      expect(filter.course?.teacherAssignments?.some?.teacherUserId).toBe(userId);
    });

    it('should scope PARENT to linked children', () => {
      const filter = service.buildListFilter(userId, institutionId, 'PARENT') as unknown as ListFilterShape;
      expect(filter.student?.guardianStudents?.some?.guardianUserId).toBe(userId);
    });

    it('should scope STUDENT to own records', () => {
      const filter = service.buildListFilter(userId, institutionId, 'STUDENT') as unknown as ListFilterShape;
      expect(filter.student?.user?.id).toBe(userId);
    });

    it('should never match for SUPER_ADMIN', () => {
      const filter = service.buildListFilter(userId, institutionId, 'SUPER_ADMIN') as unknown as ListFilterShape;
      expect(filter.id).toBe('__NEVER_MATCH__');
    });
  });
});
