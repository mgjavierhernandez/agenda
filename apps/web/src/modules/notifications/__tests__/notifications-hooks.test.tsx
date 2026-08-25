import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useNotification } from '../hooks/useNotification';
import { useMarkNotificationRead } from '../hooks/useMarkNotificationRead';
import { useMarkAllNotificationsRead } from '../hooks/useMarkAllNotificationsRead';
import { useDeleteNotification } from '../hooks/useDeleteNotification';
import { useDeleteAllNotifications } from '../hooks/useDeleteAllNotifications';
import { apiClient } from '@/api/client';
import type { Notification } from '@/api/types';
import type { NotificationsListResponse } from '../hooks/useNotifications';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
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

const mockNotification: Notification = {
  id: 'notif-1',
  institutionId: 'inst-1',
  userId: 'user-1',
  type: 'SIGNATURE_REQUEST',
  title: 'Nueva solicitud de firma',
  message: 'Tienes una nueva solicitud de firma: Autorización de excursión.',
  status: 'UNREAD',
  entityType: 'SignatureRequest',
  entityId: null,
  readAt: null,
  createdAt: '2026-08-20T10:00:00Z',
  updatedAt: '2026-08-20T10:00:00Z',
};

describe('Notifications hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useNotifications', () => {
    it('fetches paginated notifications', async () => {
      const mockResponse: NotificationsListResponse = {
        data: [mockNotification],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        unreadCount: 1,
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useNotifications({ page: 1, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/notifications?page=1&limit=20');
    });

    it('sends search and filter params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 }, unreadCount: 0 });

      renderHook(() => useNotifications({ page: 2, limit: 10, search: 'firma', status: 'UNREAD', type: 'SIGNATURE_REQUEST' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
      const callUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('limit=10');
      expect(callUrl).toContain('search=firma');
      expect(callUrl).toContain('status=UNREAD');
      expect(callUrl).toContain('type=SIGNATURE_REQUEST');
    });
  });

  describe('useNotification', () => {
    it('fetches a single notification by id', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockNotification);

      const { result } = renderHook(() => useNotification('notif-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockNotification);
      expect(apiClient.get).toHaveBeenCalledWith('/notifications/notif-1');
    });

    it('does not fetch when id is empty', () => {
      const { result } = renderHook(() => useNotification(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useMarkNotificationRead', () => {
    it('marks a notification as read', async () => {
      const readNotif = { ...mockNotification, status: 'READ' as const, readAt: '2026-08-20T11:00:00Z' };
      vi.mocked(apiClient.patch).mockResolvedValue(readNotif);

      const { result } = renderHook(() => useMarkNotificationRead(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync('notif-1');
      expect(res.status).toBe('READ');
      expect(apiClient.patch).toHaveBeenCalledWith('/notifications/notif-1', { status: 'READ' });
    });
  });

  describe('useMarkAllNotificationsRead', () => {
    it('marks all notifications as read', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ count: 3 });

      const { result } = renderHook(() => useMarkAllNotificationsRead(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync();
      expect(res.count).toBe(3);
      expect(apiClient.patch).toHaveBeenCalledWith('/notifications');
    });
  });

  describe('useDeleteNotification', () => {
    it('deletes a notification', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteNotification(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync('notif-1');
      expect(apiClient.delete).toHaveBeenCalledWith('/notifications/notif-1');
    });
  });

  describe('useDeleteAllNotifications', () => {
    it('deletes all notifications', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ count: 5 });

      const { result } = renderHook(() => useDeleteAllNotifications(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync();
      expect(res.count).toBe(5);
      expect(apiClient.delete).toHaveBeenCalledWith('/notifications');
    });
  });
});
