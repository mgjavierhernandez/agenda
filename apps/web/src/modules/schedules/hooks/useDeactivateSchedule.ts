import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Schedule } from '@/api/types';

export function useDeactivateSchedule() {
  const queryClient = useQueryClient();

  return useMutation<Schedule, Error, string>({
    mutationFn: (id) => apiClient.patch(`/schedules/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}
