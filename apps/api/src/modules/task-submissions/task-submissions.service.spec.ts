import { NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { TaskSubmissionsService } from './task-submissions.service';
import { TaskSubmissionStatus } from '@prisma/client';
import { getUserRoleNames, hasFullAccess } from '../../common/auth/academic-scope';

jest.mock('../../common/auth/academic-scope', () => ({
  getUserRoleNames: jest.fn(),
  hasFullAccess: jest.fn(),
  resolveAccessibleStudentIds: jest.fn(),
  resolveAccessibleCourseIds: jest.fn(),
  FULL_ACCESS_ROLES: new Set(),
  TEACHER_SCOPED_ROLES: new Set(),
}));

const mockedGetRoles = jest.mocked(getUserRoleNames);
const mockedHasFull = jest.mocked(hasFullAccess);

describe('TaskSubmissionsService', () => {
  let service: TaskSubmissionsService;
  let prismaMock: {
    taskAssignment: { findFirst: jest.Mock };
    student: { findFirst: jest.Mock };
    teacherAssignment: { findFirst: jest.Mock };
    fileAsset: { findFirst: jest.Mock };
    submissionAttachment: { count: jest.Mock; findUnique: jest.Mock; create: jest.Mock; findFirst: jest.Mock; delete: jest.Mock };
    taskSubmission: {
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
  const taskAssignmentId = 'ta-1';

  beforeEach(() => {
    prismaMock = {
      taskAssignment: { findFirst: jest.fn() },
      student: { findFirst: jest.fn() },
      teacherAssignment: { findFirst: jest.fn() },
      fileAsset: { findFirst: jest.fn() },
      submissionAttachment: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      taskSubmission: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    auditServiceMock = { log: jest.fn() };

    service = new TaskSubmissionsService(
      prismaMock as never,
      auditServiceMock as never,
    );

    // Default: administrative caller.
    mockedGetRoles.mockReset();
    mockedHasFull.mockReset();
    mockedGetRoles.mockResolvedValue(['INSTITUTION_ADMIN']);
    mockedHasFull.mockReturnValue(true);
    prismaMock.student.findFirst.mockResolvedValue(null);
    prismaMock.teacherAssignment.findFirst.mockResolvedValue(null);
  });

  describe('create', () => {
    it('should create a submission for an assignment', async () => {
      const futureDue = new Date(Date.now() + 86400000);
      prismaMock.taskAssignment.findFirst.mockResolvedValue({
        id: taskAssignmentId,
        institutionId,
        studentId: 'student-1',
        task: { dueDate: futureDue },
      });
      prismaMock.taskSubmission.findUnique.mockResolvedValue(null);
      prismaMock.taskSubmission.create.mockResolvedValue({
        id: 'sub-1',
        institutionId,
        taskAssignmentId,
        status: TaskSubmissionStatus.SUBMITTED,
      });

      const result = await service.create(institutionId, taskAssignmentId, { content: 'My work' }, userId);

      expect(result.status).toBe(TaskSubmissionStatus.SUBMITTED);
    });

    it('should throw if assignment not found', async () => {
      prismaMock.taskAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.create(institutionId, taskAssignmentId, {}, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if submission already exists', async () => {
      prismaMock.taskAssignment.findFirst.mockResolvedValue({
        id: taskAssignmentId,
        institutionId,
        studentId: 'student-1',
        task: { dueDate: new Date(Date.now() + 86400000) },
      });
      prismaMock.taskSubmission.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(institutionId, taskAssignmentId, {}, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('should mark as LATE if past due date', async () => {
      const pastDue = new Date(Date.now() - 86400000);
      prismaMock.taskAssignment.findFirst.mockResolvedValue({
        id: taskAssignmentId,
        institutionId,
        studentId: 'student-1',
        task: { dueDate: pastDue },
      });
      prismaMock.taskSubmission.findUnique.mockResolvedValue(null);
      prismaMock.taskSubmission.create.mockResolvedValue({
        id: 'sub-1',
        status: TaskSubmissionStatus.LATE,
      });

      const result = await service.create(institutionId, taskAssignmentId, {}, userId);
      expect(result.status).toBe(TaskSubmissionStatus.LATE);
    });

    it('should allow the owning student to submit', async () => {
      mockedGetRoles.mockResolvedValue(['STUDENT']);
      mockedHasFull.mockReturnValue(false);
      prismaMock.taskAssignment.findFirst.mockResolvedValue({
        id: taskAssignmentId,
        institutionId,
        studentId: 'student-1',
        task: { dueDate: new Date(Date.now() + 86400000), courseId: 'course-1' },
      });
      prismaMock.student.findFirst.mockResolvedValue({ id: 'student-1', userId });
      prismaMock.taskSubmission.findUnique.mockResolvedValue(null);
      prismaMock.taskSubmission.create.mockResolvedValue({
        id: 'sub-1',
        status: TaskSubmissionStatus.SUBMITTED,
      });

      const result = await service.create(institutionId, taskAssignmentId, { content: 'x' }, userId);
      expect(result.status).toBe(TaskSubmissionStatus.SUBMITTED);
    });

    it('should forbid a stranger from submitting', async () => {
      mockedGetRoles.mockResolvedValue(['STUDENT']);
      mockedHasFull.mockReturnValue(false);
      prismaMock.taskAssignment.findFirst.mockResolvedValue({
        id: taskAssignmentId,
        institutionId,
        studentId: 'student-1',
        task: { dueDate: new Date(Date.now() + 86400000), courseId: 'course-1' },
      });
      prismaMock.student.findFirst.mockResolvedValue({ id: 'student-1', userId: 'other-user' });
      prismaMock.teacherAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.create(institutionId, taskAssignmentId, { content: 'x' }, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should attach uploaded files on submit', async () => {
      prismaMock.taskAssignment.findFirst.mockResolvedValue({
        id: taskAssignmentId,
        institutionId,
        studentId: 'student-1',
        task: { dueDate: new Date(Date.now() + 86400000), courseId: 'course-1' },
      });
      prismaMock.taskSubmission.findUnique.mockResolvedValue(null);
      prismaMock.taskSubmission.create.mockResolvedValue({
        id: 'sub-1',
        status: TaskSubmissionStatus.SUBMITTED,
      });
      prismaMock.fileAsset.findFirst.mockResolvedValue({
        id: 'file-1',
        institutionId,
        originalName: 'tarea.pdf',
        mimeType: 'application/pdf',
      });
      prismaMock.submissionAttachment.create.mockResolvedValue({ id: 'att-1' });

      const result = await service.create(
        institutionId,
        taskAssignmentId,
        { content: 'x', fileAssetIds: ['file-1'] },
        userId,
      );

      expect(result.status).toBe(TaskSubmissionStatus.SUBMITTED);
      expect(prismaMock.submissionAttachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ submissionId: 'sub-1', fileAssetId: 'file-1' }),
        }),
      );
    });

    it('should reject files from another institution', async () => {
      prismaMock.taskAssignment.findFirst.mockResolvedValue({
        id: taskAssignmentId,
        institutionId,
        studentId: 'student-1',
        task: { dueDate: new Date(Date.now() + 86400000), courseId: 'course-1' },
      });
      prismaMock.taskSubmission.findUnique.mockResolvedValue(null);
      prismaMock.taskSubmission.create.mockResolvedValue({
        id: 'sub-1',
        status: TaskSubmissionStatus.SUBMITTED,
      });
      prismaMock.fileAsset.findFirst.mockResolvedValue(null);

      await expect(
        service.create(institutionId, taskAssignmentId, { content: 'x', fileAssetIds: ['file-x'] }, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('grade', () => {
    it('should grade a submission', async () => {
      prismaMock.taskSubmission.findFirst.mockResolvedValue({
        id: 'sub-1',
        institutionId,
        status: TaskSubmissionStatus.SUBMITTED,
        taskAssignment: { task: { dueDate: new Date() } },
      });
      prismaMock.taskSubmission.update.mockResolvedValue({
        id: 'sub-1',
        status: TaskSubmissionStatus.GRADED,
        grade: 85,
      });

      const result = await service.grade(institutionId, 'sub-1', { grade: '85', feedback: 'Good' }, userId);
      expect(result.status).toBe(TaskSubmissionStatus.GRADED);
    });

    it('should reject grading already graded submission', async () => {
      prismaMock.taskSubmission.findFirst.mockResolvedValue({
        id: 'sub-1',
        institutionId,
        status: TaskSubmissionStatus.GRADED,
        taskAssignment: { task: { dueDate: new Date() } },
      });

      await expect(
        service.grade(institutionId, 'sub-1', { grade: '85' }, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should forbid grading by a teacher of another course', async () => {
      mockedGetRoles.mockResolvedValue(['TEACHER']);
      mockedHasFull.mockReturnValue(false);
      prismaMock.taskSubmission.findFirst.mockResolvedValue({
        id: 'sub-1',
        institutionId,
        status: TaskSubmissionStatus.SUBMITTED,
        taskAssignment: { task: { dueDate: new Date(), courseId: 'course-1' } },
      });
      prismaMock.teacherAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.grade(institutionId, 'sub-1', { grade: '85' }, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
