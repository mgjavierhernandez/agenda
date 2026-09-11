import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAgendaEvents } from '../hooks/useAgendaEvents';
import { useAgendaEvent } from '../hooks/useAgendaEvent';
import { useCreateAgendaEvent } from '../hooks/useCreateAgendaEvent';
import { useUpdateAgendaEvent } from '../hooks/useUpdateAgendaEvent';
import { useCancelAgendaEvent } from '../hooks/useCancelAgendaEvent';
import { apiClient } from '@/api/client';
import type { AgendaEventItem } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPatch = vi.mocked(apiClient.patch);
const mockDelete = vi.mocked(apiClient.delete);

const mockEvent: AgendaEventItem = {
  id: 'ev-1',
  institutionId: 'inst-1',
  createdById: 'user-1',
  title: 'Reunion de padres',
  description: null,
  startAt: '2026-09-10T14:00:00.000Z',
  endAt: '2026-09-10T16:00:00.000Z',
  location: 'Salon de actos',
  audience: 'ALL',
  status: 'ACTIVE',
  createdAt: '2026-08-30T10:00:00.000Z',
  updatedAt: '2026-08-30T10:00:00.000Z',
  createdBy: { id: 'user-1', firstName: 'Test', lastName: 'User' },
};

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('agenda events hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useAgendaEvents fetches the paginated list', async () => {
    mockGet.mockResolvedValueOnce({
      data: [mockEvent],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const { result } = renderHook(
      () => useAgendaEvents({ status: 'ACTIVE', audience: 'ALL', search: 'padres' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('status=ACTIVE'));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('audience=ALL'));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('search=padres'));
  });

  it('useAgendaEvent fetches a single event and is disabled without id', async () => {
    mockGet.mockResolvedValueOnce(mockEvent);

    const { result } = renderHook(() => useAgendaEvent(''), { wrapper: createWrapper() });
    expect(result.current.isPending).toBe(true);
    expect(mockGet).not.toHaveBeenCalled();

    const { result: withId } = renderHook(() => useAgendaEvent('ev-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(withId.current.isSuccess).toBe(true);
    });
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('/agenda/events/ev-1'));
  });

  it('useCreateAgendaEvent posts to /agenda/events', async () => {
    mockPost.mockResolvedValueOnce(mockEvent);

    const { result } = renderHook(() => useCreateAgendaEvent(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      title: 'Reunion de padres',
      startAt: '2026-09-10T14:00:00.000Z',
      endAt: '2026-09-10T16:00:00.000Z',
      audience: 'ALL',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockPost).toHaveBeenCalledWith('/agenda/events', {
      title: 'Reunion de padres',
      startAt: '2026-09-10T14:00:00.000Z',
      endAt: '2026-09-10T16:00:00.000Z',
      audience: 'ALL',
    });
  });

  it('useUpdateAgendaEvent patches /agenda/events/:id', async () => {
    mockPatch.mockResolvedValueOnce({ ...mockEvent, title: 'Updated' });

    const { result } = renderHook(() => useUpdateAgendaEvent(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 'ev-1', data: { title: 'Updated' } });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockPatch).toHaveBeenCalledWith('/agenda/events/ev-1', { title: 'Updated' });
  });

  it('useCancelAgendaEvent deletes /agenda/events/:id', async () => {
    mockDelete.mockResolvedValueOnce({ ...mockEvent, status: 'CANCELLED' });

    const { result } = renderHook(() => useCancelAgendaEvent(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('ev-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockDelete).toHaveBeenCalledWith('/agenda/events/ev-1');
  });
});
