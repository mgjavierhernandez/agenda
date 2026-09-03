import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { AgendaEventItem } from '@/api/types';

export function useAgendaEvent(id: string) {
  return useQuery<AgendaEventItem>({
    queryKey: ['agenda-events', id],
    queryFn: () => apiClient.get(`/agenda/events/${id}`),
    enabled: !!id,
  });
}