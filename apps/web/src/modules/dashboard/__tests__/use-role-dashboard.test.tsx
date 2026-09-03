import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useRoleDashboard } from '../hooks/useRoleDashboard';
import { apiClient } from '@/api/client';

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

const payload = {
  role: 'TEACHER' as const,
  activePeriod: null,
  stats: { courses: 1 },
  children: [],
  courses: [],
  subjects: [],
  recentNotifications: [],
  upcomingEvents: [],
  recentCommunications: [],
  pendingSignatures: [],
  followUps: [],
  pendingCommitments: [],
};

describe('useRoleDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the dashboard when enabled', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(payload);
    const { result } = renderHook(() => useRoleDashboard(true), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.data).toEqual(payload);
    });
    expect(apiClient.get).toHaveBeenCalledWith('/dashboard');
  });

  it('does not fetch when disabled', () => {
    vi.mocked(apiClient.get).mockResolvedValue(payload);
    renderHook(() => useRoleDashboard(false), { wrapper: createWrapper() });
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
