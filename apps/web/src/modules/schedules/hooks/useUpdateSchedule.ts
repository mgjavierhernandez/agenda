import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UpdateScheduleInput, Schedule } from '@/api/types';

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation<Schedule, Error, { id: string; data: UpdateScheduleInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/schedules/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.id] });
    },
  });
}
