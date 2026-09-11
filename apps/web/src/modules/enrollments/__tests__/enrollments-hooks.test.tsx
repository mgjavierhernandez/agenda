import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useEnrollments } from '../hooks/useEnrollments';
import { useEnrollment } from '../hooks/useEnrollment';
import { useCreateEnrollment } from '../hooks/useCreateEnrollment';
import { useUpdateEnrollment } from '../hooks/useUpdateEnrollment';
import { useDeactivateEnrollment } from '../hooks/useDeactivateEnrollment';
import { apiClient } from '@/api/client';
import type { Enrollment, PaginatedApiResponse } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
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

const mockEnrollment: Enrollment = {
  id: 'enr-1',
  institutionId: 'inst-1',
  studentId: 'stu-1',
  courseId: 'cou-1',
  schoolGradeId: 'sg-1',
  academicPeriodId: 'ap-1',
  status: 'ACTIVE',
  enrolledAt: '2026-01-15T10:00:00Z',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

describe('Enrollments hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEnrollments', () => {
    it('fetches paginated enrollments', async () => {
      const mockResponse: PaginatedApiResponse<Enrollment> = {
        data: [mockEnrollment],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useEnrollments({ page: 1, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/enrollments?page=1&limit=20');
    });

    it('sends filter params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      renderHook(
        () => useEnrollments({ page: 2, limit: 10, studentId: 'stu-1', courseId: 'cou-1' }),
        {
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
      const callUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('limit=10');
      expect(callUrl).toContain('studentId=stu-1');
      expect(callUrl).toContain('courseId=cou-1');
    });

    it('omits undefined filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      renderHook(() => useEnrollments({ page: 1, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
      const callUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
      expect(callUrl).not.toContain('studentId');
      expect(callUrl).not.toContain('courseId');
    });
  });

  describe('useEnrollment', () => {
    it('fetches a single enrollment by id', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockEnrollment);

      const { result } = renderHook(() => useEnrollment('enr-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockEnrollment);
      expect(apiClient.get).toHaveBeenCalledWith('/enrollments/enr-1');
    });

    it('does not fetch when id is empty', () => {
      const { result } = renderHook(() => useEnrollment(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateEnrollment', () => {
    it('creates an enrollment', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(mockEnrollment);

      const { result } = renderHook(() => useCreateEnrollment(), {
        wrapper: createWrapper(),
      });

      const created = await result.current.mutateAsync({
        studentId: 'stu-1',
        courseId: 'cou-1',
        schoolGradeId: 'sg-1',
        academicPeriodId: 'ap-1',
      });

      expect(created).toEqual(mockEnrollment);
      expect(apiClient.post).toHaveBeenCalledWith('/enrollments', {
        studentId: 'stu-1',
        courseId: 'cou-1',
        schoolGradeId: 'sg-1',
        academicPeriodId: 'ap-1',
      });
    });
  });

  describe('useUpdateEnrollment', () => {
    it('updates enrollment status', async () => {
      const updated = { ...mockEnrollment, status: 'INACTIVE' as const };
      vi.mocked(apiClient.patch).mockResolvedValue(updated);

      const { result } = renderHook(() => useUpdateEnrollment(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync({
        id: 'enr-1',
        data: { status: 'INACTIVE' },
      });

      expect(res.status).toBe('INACTIVE');
      expect(apiClient.patch).toHaveBeenCalledWith('/enrollments/enr-1', { status: 'INACTIVE' });
    });
  });

  describe('useDeactivateEnrollment', () => {
    it('deactivates an enrollment', async () => {
      const deactivated = { ...mockEnrollment, status: 'INACTIVE' as const };
      vi.mocked(apiClient.patch).mockResolvedValue(deactivated);

      const { result } = renderHook(() => useDeactivateEnrollment(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync('enr-1');
      expect(res.status).toBe('INACTIVE');
      expect(apiClient.patch).toHaveBeenCalledWith('/enrollments/enr-1/deactivate');
    });
  });
});
