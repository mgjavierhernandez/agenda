import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useCommunications } from '../hooks/useCommunications';
import { useCommunication } from '../hooks/useCommunication';
import { useCreateCommunication } from '../hooks/useCreateCommunication';
import { useUpdateCommunication } from '../hooks/useUpdateCommunication';
import { usePublishCommunication } from '../hooks/usePublishCommunication';
import { useDeactivateCommunication } from '../hooks/useDeactivateCommunication';
import { apiClient } from '@/api/client';
import type { Communication, PaginatedApiResponse } from '@/api/types';

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

const mockCommunication: Communication = {
  id: 'comm-1',
  institutionId: 'inst-1',
  title: 'Comunicado importante',
  content: 'Contenido del comunicado',
  audience: 'ALL',
  status: 'DRAFT',
  publishedAt: null,
  expiresAt: null,
  authorId: 'user-1',
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z',
};

describe('Communications hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCommunications', () => {
    it('fetches paginated communications', async () => {
      const mockResponse: PaginatedApiResponse<Communication> = {
        data: [mockCommunication],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCommunications({ page: 1, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/communications?page=1&limit=20');
    });

    it('sends search and filter params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

      renderHook(() => useCommunications({ page: 2, limit: 10, search: 'test', status: 'PUBLISHED', audience: 'TEACHERS' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('limit=10')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('search=test')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=PUBLISHED')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('audience=TEACHERS')
      );
    });
  });

  describe('useCommunication', () => {
    it('fetches a single communication by id', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockCommunication);

      const { result } = renderHook(() => useCommunication('comm-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockCommunication);
      expect(apiClient.get).toHaveBeenCalledWith('/communications/comm-1');
    });

    it('does not fetch when id is empty', () => {
      const { result } = renderHook(() => useCommunication(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateCommunication', () => {
    it('creates communication and invalidates list', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(mockCommunication);

      const { result } = renderHook(() => useCreateCommunication(), {
        wrapper: createWrapper(),
      });

      const created = await result.current.mutateAsync({
        title: 'Comunicado importante',
        content: 'Contenido',
        audience: 'ALL',
      });

      expect(created).toEqual(mockCommunication);
      expect(apiClient.post).toHaveBeenCalledWith('/communications', {
        title: 'Comunicado importante',
        content: 'Contenido',
        audience: 'ALL',
      });
    });
  });

  describe('useUpdateCommunication', () => {
    it('updates communication with patch', async () => {
      const updated = { ...mockCommunication, title: 'Título actualizado' };
      vi.mocked(apiClient.patch).mockResolvedValue(updated);

      const { result } = renderHook(() => useUpdateCommunication(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync({
        id: 'comm-1',
        data: { title: 'Título actualizado' },
      });

      expect(res).toEqual(updated);
      expect(apiClient.patch).toHaveBeenCalledWith('/communications/comm-1', { title: 'Título actualizado' });
    });
  });

  describe('usePublishCommunication', () => {
    it('publishes communication', async () => {
      const published = { ...mockCommunication, status: 'PUBLISHED' as const, publishedAt: '2026-08-23T10:00:00Z' };
      vi.mocked(apiClient.patch).mockResolvedValue(published);

      const { result } = renderHook(() => usePublishCommunication(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync('comm-1');
      expect(res.status).toBe('PUBLISHED');
      expect(apiClient.patch).toHaveBeenCalledWith('/communications/comm-1/publish');
    });
  });

  describe('useDeactivateCommunication', () => {
    it('deactivates communication', async () => {
      const deactivated = { ...mockCommunication, status: 'INACTIVE' as const };
      vi.mocked(apiClient.patch).mockResolvedValue(deactivated);

      const { result } = renderHook(() => useDeactivateCommunication(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync('comm-1');
      expect(res.status).toBe('INACTIVE');
      expect(apiClient.patch).toHaveBeenCalledWith('/communications/comm-1/deactivate');
    });
  });
});
