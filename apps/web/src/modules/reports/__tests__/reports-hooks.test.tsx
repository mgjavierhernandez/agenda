import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useStudentReport, useStudentBulletin, useCourseReport } from '../hooks/useReports';
import { apiClient } from '@/api/client';
import type { StudentReport, CourseReport } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    download: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockReport: StudentReport = {
  student: { id: 'stu-1', firstName: 'Ana', lastName: 'García', documentType: 'DNI', documentNumber: '123', status: 'ACTIVE' },
  institution: { id: 'inst-1', name: 'Demo School', slug: 'demo-school' },
  academicPeriod: { id: 'ap-1', name: '2026 - Periodo 1', code: '2026-P1', status: 'ACTIVE', startDate: '2026-01-15', endDate: '2026-06-30' },
  enrollment: { courseId: 'c-1', courseCode: 'MAT-10', courseName: 'Matemáticas', schoolGradeId: 'sg-1', schoolGradeName: 'Grado 10', enrolledAt: '2026-01-15' },
  academic: [
    {
      subjectId: 'sub-1',
      subjectCode: 'MAT',
      subjectName: 'Matemáticas',
      grades: [{ id: 'g-1', value: 4.5, period: 'P1', status: 'ACTIVE', updatedAt: '2026-03-01' }],
      simpleAverage: 4.5,
      teacher: { id: 't-1', firstName: 'Carlos', lastName: 'Pérez' },
    },
  ],
  attendance: { total: 40, present: 35, absent: 2, late: 2, excused: 1 },
  observador: { total: 3, open: 1, resolved: 2, byConfidentiality: { PUBLICA: 2, CONFIDENCIAL: 1 } },
};

const mockCourseReport: CourseReport = {
  course: { id: 'c-1', code: 'MAT-10', name: 'Matemáticas', status: 'ACTIVE' },
  academicPeriod: { id: 'ap-1', name: '2026 - Periodo 1', code: '2026-P1', status: 'ACTIVE', startDate: '2026-01-15', endDate: '2026-06-30' },
  students: [
    {
      student: { id: 'stu-1', firstName: 'Ana', lastName: 'García', documentType: 'DNI', documentNumber: '123', status: 'ACTIVE' },
      schoolGradeName: 'Grado 10',
      subjectCount: 6,
      gradeCount: 18,
      simpleAverage: 4.2,
      attendance: { total: 40, present: 35, absent: 2, late: 2, excused: 1 },
    },
  ],
  summary: { totalStudents: 1, studentsWithGrades: 1, studentsWithAttendance: 1 },
};

describe('Reports hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useStudentReport', () => {
    it('fetches the individual report by student id', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockReport);

      const { result } = renderHook(() => useStudentReport('stu-1', 'ap-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockReport);
      expect(apiClient.get).toHaveBeenCalledWith('/reports/students/stu-1?academicPeriodId=ap-1');
    });

    it('does not fetch without a student id', () => {
      const { result } = renderHook(() => useStudentReport(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useStudentBulletin', () => {
    it('fetches the bulletin for a student', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockReport);

      const { result } = renderHook(() => useStudentBulletin('stu-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiClient.get).toHaveBeenCalledWith('/reports/students/stu-1/bulletin');
    });
  });

  describe('useCourseReport', () => {
    it('fetches the course report by course and period', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockCourseReport);

      const { result } = renderHook(() => useCourseReport('c-1', 'ap-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockCourseReport);
      expect(apiClient.get).toHaveBeenCalledWith('/reports/courses/c-1?academicPeriodId=ap-1');
    });

    it('does not fetch without a course id', () => {
      const { result } = renderHook(() => useCourseReport(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });
});