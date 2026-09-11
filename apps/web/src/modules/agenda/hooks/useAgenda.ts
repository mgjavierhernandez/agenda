import { useQuery, useQueries } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { AgendaResponse, ListAgendaParams, AgendaEventType } from '@/api/types';

export function useAgenda(params: ListAgendaParams) {
  const { start, end, view = 'day', eventTypes, studentId, page = 1, limit = 200 } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('start', start);
  searchParams.set('end', end);
  // 'year' es una vista compuesta del frontend; al backend se le pide 'month'.
  searchParams.set('view', view === 'year' ? 'month' : view);
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (eventTypes && eventTypes.length > 0) {
    eventTypes.forEach((et) => searchParams.append('eventTypes', et));
  }
  if (studentId) searchParams.set('studentId', studentId);

  return useQuery<AgendaResponse>({
    queryKey: ['agenda', { start, end, view, eventTypes, studentId, page, limit }],
    queryFn: () => apiClient.get(`/agenda?${searchParams.toString()}`),
    staleTime: 5 * 60 * 1000,
  });
}

function toISODate(d: Date): string {
  return d.toISOString();
}

/**
 * Vista anual: 6 consultas bimestrales (cada una ≤62 días, límite del backend)
 * para agregar conteos por mes sin exceder el rango permitido.
 */
export function useYearAgenda(
  year: number,
  opts: { eventTypes?: AgendaEventType[]; studentId?: string } = {},
) {
  const { eventTypes, studentId } = opts;
  const chunks = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(year, i * 2, 1, 0, 0, 0, 0);
    const end = new Date(year, i * 2 + 2, 0, 23, 59, 59, 999);
    return { start: toISODate(start), end: toISODate(end) };
  });

  const results = useQueries({
    queries: chunks.map((c) => {
      const searchParams = new URLSearchParams();
      searchParams.set('start', c.start);
      searchParams.set('end', c.end);
      searchParams.set('view', 'month');
      searchParams.set('page', '1');
      searchParams.set('limit', '200');
      if (eventTypes && eventTypes.length > 0) {
        eventTypes.forEach((et) => searchParams.append('eventTypes', et));
      }
      if (studentId) searchParams.set('studentId', studentId);
      return {
        queryKey: ['agenda', { start: c.start, end: c.end, view: 'month' as const, eventTypes, studentId, page: 1, limit: 200 }],
        queryFn: () => apiClient.get<AgendaResponse>(`/agenda?${searchParams.toString()}`),
        staleTime: 5 * 60 * 1000,
      };
    }),
  });

  const countsByMonth: number[] = Array.from({ length: 12 }, () => 0);
  for (const r of results) {
    for (const ev of r.data?.data ?? []) {
      const m = new Date(ev.start).getMonth();
      if (new Date(ev.start).getFullYear() === year) countsByMonth[m] += 1;
    }
  }

  return {
    countsByMonth,
    isLoading: results.some((r) => r.isLoading),
    error: results.find((r) => r.error)?.error ?? null,
  };
}
