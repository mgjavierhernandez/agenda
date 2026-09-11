import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { AgendaEventItem, CreateAgendaEventInput } from '@/api/types';

export function useCreateAgendaEvent() {
  const queryClient = useQueryClient();

  return useMutation<AgendaEventItem, Error, CreateAgendaEventInput>({
    mutationFn: (data) => apiClient.post('/agenda/events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
    },
  });
}
