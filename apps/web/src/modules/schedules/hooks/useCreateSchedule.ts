import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreateScheduleInput, Schedule } from '@/api/types';

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation<Schedule, Error, CreateScheduleInput>({
    mutationFn: (data) => apiClient.post('/schedules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}
