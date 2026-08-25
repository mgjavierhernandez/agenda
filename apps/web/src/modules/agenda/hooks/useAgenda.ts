import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { AgendaResponse, ListAgendaParams } from '@/api/types';

export function useAgenda(params: ListAgendaParams) {
  const { start, end, view = 'week', eventTypes, page = 1, limit = 200 } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('start', start);
  searchParams.set('end', end);
  searchParams.set('view', view);
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (eventTypes && eventTypes.length > 0) {
    eventTypes.forEach((et) => searchParams.append('eventTypes', et));
  }

  return useQuery<AgendaResponse>({
    queryKey: ['agenda', { start, end, view, eventTypes, page, limit }],
    queryFn: () => apiClient.get(`/agenda?${searchParams.toString()}`),
    staleTime: 5 * 60 * 1000,
  });
}
