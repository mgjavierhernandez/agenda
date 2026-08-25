import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Schedule } from '@/api/types';

export function useSchedule(id: string) {
  return useQuery<Schedule>({
    queryKey: ['schedules', id],
    queryFn: () => apiClient.get(`/schedules/${id}`),
    enabled: !!id,
  });
}
