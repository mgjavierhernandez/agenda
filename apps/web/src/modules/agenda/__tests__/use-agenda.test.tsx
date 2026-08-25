import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import { useAgenda } from '../hooks/useAgenda';
import { apiClient } from '@/api/client';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useAgenda', () => {
  it('should fetch agenda data', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      start: '2026-08-24',
      end: '2026-08-30',
      total: 0,
    });

    const { result } = renderHook(
      () => useAgenda({ start: '2026-08-24', end: '2026-08-30' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('start=2026-08-24'),
    );
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('end=2026-08-30'),
    );
  });

  it('should include eventTypes in query', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      start: '2026-08-24',
      end: '2026-08-30',
      total: 0,
    });

    const { result } = renderHook(
      () =>
        useAgenda({
          start: '2026-08-24',
          end: '2026-08-30',
          eventTypes: ['TASK', 'SCHEDULE'],
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('eventTypes=TASK'),
    );
  });

  it('should include view in query', async () => {
    mockGet.mockResolvedValueOnce({
      data: [],
      start: '2026-08-24',
      end: '2026-08-30',
      total: 0,
    });

    const { result } = renderHook(
      () =>
        useAgenda({
          start: '2026-08-24',
          end: '2026-08-30',
          view: 'month',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('view=month'),
    );
  });
});
