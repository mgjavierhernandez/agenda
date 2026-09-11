import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useUsers } from '../hooks/useUsers';
import { apiClient } from '@/api/client';

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

const mockUsersResponse = {
  data: [
    {
      id: 'user-1',
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      status: 'ACTIVE',
    },
    {
      id: 'user-2',
      email: 'teacher@test.com',
      firstName: 'Teacher',
      lastName: 'User',
      status: 'ACTIVE',
    },
  ],
  meta: { total: 2, page: 1, limit: 200, totalPages: 1 },
};

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches active users with default params', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockUsersResponse);

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockUsersResponse);
    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('/users?'));
  });

  it('includes search param when provided', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockUsersResponse);

    renderHook(() => useUsers('test'), { wrapper: createWrapper() });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const callUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
    expect(callUrl).toContain('search=test');
  });

  it('sets limit=200 and status=ACTIVE', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockUsersResponse);

    renderHook(() => useUsers(), { wrapper: createWrapper() });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const callUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
    expect(callUrl).toContain('limit=200');
    expect(callUrl).toContain('status=ACTIVE');
  });
});
