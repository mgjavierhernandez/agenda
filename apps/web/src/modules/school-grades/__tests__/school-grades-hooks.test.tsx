import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useSchoolGrades } from '../hooks/useSchoolGrades';
import { useSchoolGrade } from '../hooks/useSchoolGrade';
import { useCreateSchoolGrade } from '../hooks/useCreateSchoolGrade';
import { useUpdateSchoolGrade } from '../hooks/useUpdateSchoolGrade';
import { useDeactivateSchoolGrade } from '../hooks/useDeactivateSchoolGrade';
import { apiClient } from '@/api/client';
import type { SchoolGrade, PaginatedApiResponse } from '@/api/types';

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

const mockGrade: SchoolGrade = {
  id: 'sg-1',
  institutionId: 'inst-1',
  name: 'Preescolar',
  code: 'PRE',
  sortOrder: 0,
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

describe('School Grades hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSchoolGrades', () => {
    it('fetches paginated school grades', async () => {
      const mockResponse: PaginatedApiResponse<SchoolGrade> = {
        data: [mockGrade],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSchoolGrades({ page: 1, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/school-grades?page=1&limit=20');
    });

    it('sends search param', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      renderHook(() => useSchoolGrades({ page: 2, limit: 10, search: 'preescolar' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
      const callUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('limit=10');
      expect(callUrl).toContain('search=preescolar');
    });
  });

  describe('useSchoolGrade', () => {
    it('fetches a single school grade by id', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockGrade);

      const { result } = renderHook(() => useSchoolGrade('sg-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockGrade);
      expect(apiClient.get).toHaveBeenCalledWith('/school-grades/sg-1');
    });

    it('does not fetch when id is empty', () => {
      const { result } = renderHook(() => useSchoolGrade(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateSchoolGrade', () => {
    it('creates a school grade and invalidates list', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(mockGrade);

      const { result } = renderHook(() => useCreateSchoolGrade(), {
        wrapper: createWrapper(),
      });

      const created = await result.current.mutateAsync({
        name: 'Preescolar',
        code: 'PRE',
        sortOrder: 0,
      });

      expect(created).toEqual(mockGrade);
      expect(apiClient.post).toHaveBeenCalledWith('/school-grades', {
        name: 'Preescolar',
        code: 'PRE',
        sortOrder: 0,
      });
    });
  });

  describe('useUpdateSchoolGrade', () => {
    it('updates a school grade with patch', async () => {
      const updated = { ...mockGrade, name: 'Preescolar Actualizado' };
      vi.mocked(apiClient.patch).mockResolvedValue(updated);

      const { result } = renderHook(() => useUpdateSchoolGrade(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync({
        id: 'sg-1',
        data: { name: 'Preescolar Actualizado' },
      });

      expect(res).toEqual(updated);
      expect(apiClient.patch).toHaveBeenCalledWith('/school-grades/sg-1', {
        name: 'Preescolar Actualizado',
      });
    });
  });

  describe('useDeactivateSchoolGrade', () => {
    it('deactivates a school grade', async () => {
      const deactivated = { ...mockGrade, status: 'INACTIVE' as const };
      vi.mocked(apiClient.patch).mockResolvedValue(deactivated);

      const { result } = renderHook(() => useDeactivateSchoolGrade(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync('sg-1');
      expect(res.status).toBe('INACTIVE');
      expect(apiClient.patch).toHaveBeenCalledWith('/school-grades/sg-1/deactivate');
    });
  });
});
