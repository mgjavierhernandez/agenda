import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useTeacherAssignments } from '../hooks/useTeacherAssignments';
import { useTeacherAssignment } from '../hooks/useTeacherAssignment';
import { useCreateTeacherAssignment } from '../hooks/useCreateTeacherAssignment';
import { useUpdateTeacherAssignment } from '../hooks/useUpdateTeacherAssignment';
import { useDeactivateTeacherAssignment } from '../hooks/useDeactivateTeacherAssignment';
import { apiClient } from '@/api/client';
import type { TeacherAssignment, PaginatedApiResponse } from '@/api/types';

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

const mockAssignment: TeacherAssignment = {
  id: 'ta-1',
  institutionId: 'inst-1',
  teacherUserId: 'user-1',
  courseId: 'cou-1',
  subjectId: 'sub-1',
  academicPeriodId: 'ap-1',
  status: 'ACTIVE',
  startDate: '2026-01-15',
  endDate: null,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

describe('Teacher Assignments hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useTeacherAssignments', () => {
    it('fetches paginated teacher assignments', async () => {
      const mockResponse: PaginatedApiResponse<TeacherAssignment> = {
        data: [mockAssignment],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useTeacherAssignments({ page: 1, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/teacher-assignments?page=1&limit=20');
    });

    it('sends filter params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

      renderHook(() => useTeacherAssignments({ page: 1, limit: 10, teacherUserId: 'user-1', courseId: 'cou-1' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
      const callUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
      expect(callUrl).toContain('teacherUserId=user-1');
      expect(callUrl).toContain('courseId=cou-1');
    });

    it('omits undefined filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

      renderHook(() => useTeacherAssignments({ page: 1, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
      const callUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
      expect(callUrl).not.toContain('teacherUserId');
      expect(callUrl).not.toContain('courseId');
    });
  });

  describe('useTeacherAssignment', () => {
    it('fetches a single teacher assignment by id', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockAssignment);

      const { result } = renderHook(() => useTeacherAssignment('ta-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockAssignment);
      expect(apiClient.get).toHaveBeenCalledWith('/teacher-assignments/ta-1');
    });

    it('does not fetch when id is empty', () => {
      const { result } = renderHook(() => useTeacherAssignment(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateTeacherAssignment', () => {
    it('creates a teacher assignment', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(mockAssignment);

      const { result } = renderHook(() => useCreateTeacherAssignment(), {
        wrapper: createWrapper(),
      });

      const created = await result.current.mutateAsync({
        teacherUserId: 'user-1',
        courseId: 'cou-1',
        subjectId: 'sub-1',
        academicPeriodId: 'ap-1',
      });

      expect(created).toEqual(mockAssignment);
      expect(apiClient.post).toHaveBeenCalledWith('/teacher-assignments', {
        teacherUserId: 'user-1',
        courseId: 'cou-1',
        subjectId: 'sub-1',
        academicPeriodId: 'ap-1',
      });
    });
  });

  describe('useUpdateTeacherAssignment', () => {
    it('updates teacher assignment status', async () => {
      const updated = { ...mockAssignment, status: 'INACTIVE' as const };
      vi.mocked(apiClient.patch).mockResolvedValue(updated);

      const { result } = renderHook(() => useUpdateTeacherAssignment(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync({
        id: 'ta-1',
        data: { status: 'INACTIVE' },
      });

      expect(res.status).toBe('INACTIVE');
      expect(apiClient.patch).toHaveBeenCalledWith('/teacher-assignments/ta-1', { status: 'INACTIVE' });
    });
  });

  describe('useDeactivateTeacherAssignment', () => {
    it('deactivates a teacher assignment', async () => {
      const deactivated = { ...mockAssignment, status: 'INACTIVE' as const };
      vi.mocked(apiClient.patch).mockResolvedValue(deactivated);

      const { result } = renderHook(() => useDeactivateTeacherAssignment(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync('ta-1');
      expect(res.status).toBe('INACTIVE');
      expect(apiClient.patch).toHaveBeenCalledWith('/teacher-assignments/ta-1/deactivate');
    });
  });
});
