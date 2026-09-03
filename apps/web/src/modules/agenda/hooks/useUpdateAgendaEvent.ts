import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { AgendaEventItem, UpdateAgendaEventInput } from '@/api/types';

export function useUpdateAgendaEvent() {
  const queryClient = useQueryClient();

  return useMutation<AgendaEventItem, Error, { id: string; data: UpdateAgendaEventInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/agenda/events/${id}`, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events', variables.id] });
    },
  });
}