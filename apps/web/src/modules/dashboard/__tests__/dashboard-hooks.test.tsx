import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useRecentTasks } from '../hooks/useRecentTasks';
import { useRecentNotifications } from '../hooks/useRecentNotifications';
import { usePendingSignatures } from '../hooks/usePendingSignatures';
import { apiClient } from '@/api/client';
import type { Task, Notification, SignatureRequest, PaginatedApiResponse } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
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

const mockTask: Task = {
  id: 'task-1',
  institutionId: 'inst-1',
  courseId: 'cou-1',
  subjectId: 'sub-1',
  title: 'Tarea de prueba',
  description: 'Descripción',
  dueDate: '2026-02-15',
  status: 'PUBLISHED',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

const mockNotification: Notification = {
  id: 'notif-1',
  institutionId: 'inst-1',
  userId: 'user-1',
  type: 'GENERAL',
  entityType: 'TASK',
  entityId: 'task-1',
  title: 'Notificación de prueba',
  message: 'Mensaje de prueba',
  status: 'UNREAD',
  readAt: null,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

const mockSignature: SignatureRequest = {
  id: 'sig-1',
  institutionId: 'inst-1',
  title: 'Firma de prueba',
  description: 'Descripción',
  status: 'PUBLISHED',
  dueDate: '2026-02-20',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
  recipients: [],
};

const paginatedResponse = <T,>(data: T[]): PaginatedApiResponse<T> => ({
  data,
  meta: { total: data.length, page: 1, limit: 20, totalPages: 1 },
});

describe('Dashboard hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useDashboardStats', () => {
    it('fetches all stats in parallel', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [],
        meta: { total: 42, page: 1, limit: 1, totalPages: 1 },
      });

      const { result } = renderHook(() => useDashboardStats(true), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.stats.students).toBe(42);
      expect(result.current.stats.courses).toBe(42);
      expect(result.current.stats.subjects).toBe(42);
      expect(result.current.stats.tasks).toBe(42);
      expect(result.current.stats.enrollments).toBe(42);
      expect(result.current.stats.signatures).toBe(42);
      expect(result.current.stats.communications).toBe(42);
    });

    it('does not fetch when not enabled', () => {
      renderHook(() => useDashboardStats(false), { wrapper: createWrapper() });
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('returns 0 for all stats when no data', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 1, totalPages: 0 },
      });

      const { result } = renderHook(() => useDashboardStats(true), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.stats.students).toBe(0);
      expect(result.current.stats.courses).toBe(0);
    });
  });

  describe('useRecentTasks', () => {
    it('fetches recent tasks', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(paginatedResponse([mockTask]));

      const { result } = renderHook(() => useRecentTasks(true), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].title).toBe('Tarea de prueba');
    });

    it('filters out inactive tasks', async () => {
      const inactiveTask = { ...mockTask, id: 'task-2', status: 'INACTIVE' as const };
      vi.mocked(apiClient.get).mockResolvedValue(paginatedResponse([mockTask, inactiveTask]));

      const { result } = renderHook(() => useRecentTasks(true), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toHaveLength(1);
    });

    it('does not fetch when not enabled', () => {
      renderHook(() => useRecentTasks(false), { wrapper: createWrapper() });
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useRecentNotifications', () => {
    it('fetches recent notifications', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(paginatedResponse([mockNotification]));

      const { result } = renderHook(() => useRecentNotifications(true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].title).toBe('Notificación de prueba');
    });

    it('does not fetch when not enabled', () => {
      renderHook(() => useRecentNotifications(false), { wrapper: createWrapper() });
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('usePendingSignatures', () => {
    it('fetches pending signatures', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(paginatedResponse([mockSignature]));

      const { result } = renderHook(() => usePendingSignatures(true), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].title).toBe('Firma de prueba');
    });

    it('does not fetch when not enabled', () => {
      renderHook(() => usePendingSignatures(false), { wrapper: createWrapper() });
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });
});
