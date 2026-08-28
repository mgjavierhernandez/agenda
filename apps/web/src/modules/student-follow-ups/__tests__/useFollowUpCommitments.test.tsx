import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useFollowUpCommitments } from '../hooks/useFollowUpCommitments';
import { apiClient } from '@/api/client';
import type { Commitment, PaginatedApiResponse } from '@/api/types';

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

const mockCommitment: Commitment = {
  id: 'commitment-1',
  followUpId: 'fu-1',
  responsibleUserId: 'user-1',
  responsibleRole: 'TEACHER',
  description: 'Follow up with parent',
  status: 'PENDING',
  dueDate: '2026-08-30T00:00:00.000Z',
  completedAt: null,
  createdAt: '2026-08-27T10:00:00.000Z',
  updatedAt: '2026-08-27T10:00:00.000Z',
};

describe('useFollowUpCommitments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches commitments for a follow-up', async () => {
    const response: PaginatedApiResponse<Commitment> = {
      data: [mockCommitment],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    };
    vi.mocked(apiClient.get).mockResolvedValue(response);

    const { result } = renderHook(() => useFollowUpCommitments('fu-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
    expect(apiClient.get).toHaveBeenCalledWith('/student-follow-ups/fu-1/commitments?page=1&limit=50');
  });

  it('does not fetch when followUpId is empty', () => {
    const { result } = renderHook(() => useFollowUpCommitments(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('returns commitment with effectiveStatus when provided', async () => {
    const commitmentWithEffective: Commitment = {
      ...mockCommitment,
      status: 'PENDING',
      effectiveStatus: 'OVERDUE',
    };
    const response: PaginatedApiResponse<Commitment> = {
      data: [commitmentWithEffective],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    };
    vi.mocked(apiClient.get).mockResolvedValue(response);

    const { result } = renderHook(() => useFollowUpCommitments('fu-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data[0].effectiveStatus).toBe('OVERDUE');
  });
});
