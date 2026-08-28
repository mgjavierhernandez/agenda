import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useUpdateFollowUpEntry } from '../hooks/useUpdateFollowUpEntry';
import { apiClient } from '@/api/client';
import type { FollowUpEntry } from '@/api/types';

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
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockEntry: FollowUpEntry = {
  id: 'entry-1',
  followUpId: 'fu-1',
  entryType: 'NOTE',
  content: 'Original content',
  createdById: 'user-1',
  createdAt: '2026-08-27T10:00:00.000Z',
};

describe('useUpdateFollowUpEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates an entry via PATCH', async () => {
    const updatedEntry: FollowUpEntry = { ...mockEntry, content: 'Updated content' };
    vi.mocked(apiClient.patch).mockResolvedValue(updatedEntry);

    const { result } = renderHook(() => useUpdateFollowUpEntry(), { wrapper: createWrapper() });

    const res = await result.current.mutateAsync({
      followUpId: 'fu-1',
      entryId: 'entry-1',
      data: { entryType: 'NOTE', content: 'Updated content' },
    });

    expect(res).toEqual(updatedEntry);
    expect(apiClient.patch).toHaveBeenCalledWith('/student-follow-ups/fu-1/entries/entry-1', {
      entryType: 'NOTE',
      content: 'Updated content',
    });
  });

  it('sends partial updates', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue(mockEntry);

    const { result } = renderHook(() => useUpdateFollowUpEntry(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      followUpId: 'fu-1',
      entryId: 'entry-1',
      data: { content: 'Only content changed' },
    });

    expect(apiClient.patch).toHaveBeenCalledWith('/student-follow-ups/fu-1/entries/entry-1', {
      content: 'Only content changed',
    });
  });
});
