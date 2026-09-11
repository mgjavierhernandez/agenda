import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useCommunicationRecipients } from '../hooks/useCommunicationRecipients';
import { useMarkCommunicationAsRead } from '../hooks/useMarkCommunicationAsRead';
import { useMarkAllCommunicationsAsRead } from '../hooks/useMarkAllCommunicationsAsRead';
import { useUnreadCommunicationsCount } from '../hooks/useUnreadCommunicationsCount';
import { apiClient } from '@/api/client';
import type { CommunicationRecipient, PaginatedApiResponse } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
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

const mockRecipient: CommunicationRecipient = {
  id: 'cr-1',
  institutionId: 'inst-1',
  communicationId: 'comm-1',
  userId: 'user-1',
  status: 'DELIVERED',
  readAt: null,
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z',
};

describe('Communication Recipients hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCommunicationRecipients', () => {
    it('fetches paginated recipients', async () => {
      const mockResponse: PaginatedApiResponse<CommunicationRecipient> = {
        data: [mockRecipient],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCommunicationRecipients({ page: 1, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/communication-recipients?page=1&limit=20');
    });

    it('sends status filter param', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      renderHook(() => useCommunicationRecipients({ status: 'READ' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('status=READ')),
      );
    });
  });

  describe('useMarkCommunicationAsRead', () => {
    it('marks recipient as read', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMarkCommunicationAsRead(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync('cr-1');
      expect(apiClient.patch).toHaveBeenCalledWith('/communication-recipients/cr-1/read');
    });
  });

  describe('useMarkAllCommunicationsAsRead', () => {
    it('marks all as read', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMarkAllCommunicationsAsRead(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync();
      expect(apiClient.patch).toHaveBeenCalledWith('/communication-recipients/mark-all-read');
    });
  });

  describe('useUnreadCommunicationsCount', () => {
    it('fetches unread count', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ count: 5 });

      const { result } = renderHook(() => useUnreadCommunicationsCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ count: 5 });
      expect(apiClient.get).toHaveBeenCalledWith('/communication-recipients/unread-count');
    });
  });
});
