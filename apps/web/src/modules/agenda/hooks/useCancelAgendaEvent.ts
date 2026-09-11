import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { AgendaEventItem } from '@/api/types';

export function useCancelAgendaEvent() {
  const queryClient = useQueryClient();

  return useMutation<AgendaEventItem, Error, string>({
    mutationFn: (id) => apiClient.delete(`/agenda/events/${id}`),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events', id] });
    },
  });
}
