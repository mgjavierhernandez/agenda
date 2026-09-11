import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, AgendaEventItem, ListAgendaEventsParams } from '@/api/types';

export function useAgendaEvents(params: ListAgendaEventsParams = {}) {
  const { page = 1, limit = 20, start, end, status, audience, search } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (start) searchParams.set('start', start);
  if (end) searchParams.set('end', end);
  if (status) searchParams.set('status', status);
  if (audience) searchParams.set('audience', audience);
  if (search) searchParams.set('search', search);

  return useQuery<PaginatedApiResponse<AgendaEventItem>>({
    queryKey: ['agenda-events', { page, limit, start, end, status, audience, search }],
    queryFn: () => apiClient.get(`/agenda/events?${searchParams.toString()}`),
  });
}
