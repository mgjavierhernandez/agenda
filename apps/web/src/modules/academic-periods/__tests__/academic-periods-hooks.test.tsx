import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useAcademicPeriods } from '../hooks/useAcademicPeriods';
import { useAcademicPeriod } from '../hooks/useAcademicPeriod';
import { useCreateAcademicPeriod } from '../hooks/useCreateAcademicPeriod';
import { useUpdateAcademicPeriod } from '../hooks/useUpdateAcademicPeriod';
import { useDeactivateAcademicPeriod } from '../hooks/useDeactivateAcademicPeriod';
import { apiClient } from '@/api/client';
import type { AcademicPeriod, PaginatedApiResponse } from '@/api/types';

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

const mockPeriod: AcademicPeriod = {
  id: 'ap-1',
  institutionId: 'inst-1',
  name: '2026 - Periodo 1',
  code: '2026-P1',
  startDate: '2026-01-15T00:00:00.000Z',
  endDate: '2026-06-30T00:00:00.000Z',
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

describe('Academic Periods hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAcademicPeriods', () => {
    it('fetches paginated academic periods', async () => {
      const mockResponse: PaginatedApiResponse<AcademicPeriod> = {
        data: [mockPeriod],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAcademicPeriods({ page: 1, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/academic-periods?page=1&limit=20');
    });

    it('sends search param', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      renderHook(() => useAcademicPeriods({ page: 2, limit: 10, search: 'periodo' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
      const callUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('limit=10');
      expect(callUrl).toContain('search=periodo');
    });
  });

  describe('useAcademicPeriod', () => {
    it('fetches a single academic period by id', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockPeriod);

      const { result } = renderHook(() => useAcademicPeriod('ap-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockPeriod);
      expect(apiClient.get).toHaveBeenCalledWith('/academic-periods/ap-1');
    });

    it('does not fetch when id is empty', () => {
      const { result } = renderHook(() => useAcademicPeriod(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateAcademicPeriod', () => {
    it('creates an academic period and invalidates list', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(mockPeriod);

      const { result } = renderHook(() => useCreateAcademicPeriod(), {
        wrapper: createWrapper(),
      });

      const created = await result.current.mutateAsync({
        name: '2026 - Periodo 1',
        code: '2026-P1',
        startDate: '2026-01-15T00:00:00.000Z',
        endDate: '2026-06-30T00:00:00.000Z',
      });

      expect(created).toEqual(mockPeriod);
      expect(apiClient.post).toHaveBeenCalledWith('/academic-periods', {
        name: '2026 - Periodo 1',
        code: '2026-P1',
        startDate: '2026-01-15T00:00:00.000Z',
        endDate: '2026-06-30T00:00:00.000Z',
      });
    });
  });

  describe('useUpdateAcademicPeriod', () => {
    it('updates an academic period with patch', async () => {
      const updated = { ...mockPeriod, name: 'Periodo actualizado' };
      vi.mocked(apiClient.patch).mockResolvedValue(updated);

      const { result } = renderHook(() => useUpdateAcademicPeriod(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync({
        id: 'ap-1',
        data: { name: 'Periodo actualizado' },
      });

      expect(res).toEqual(updated);
      expect(apiClient.patch).toHaveBeenCalledWith('/academic-periods/ap-1', {
        name: 'Periodo actualizado',
      });
    });
  });

  describe('useDeactivateAcademicPeriod', () => {
    it('deactivates an academic period', async () => {
      const deactivated = { ...mockPeriod, status: 'INACTIVE' as const };
      vi.mocked(apiClient.patch).mockResolvedValue(deactivated);

      const { result } = renderHook(() => useDeactivateAcademicPeriod(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync('ap-1');
      expect(res.status).toBe('INACTIVE');
      expect(apiClient.patch).toHaveBeenCalledWith('/academic-periods/ap-1/deactivate');
    });
  });
});
