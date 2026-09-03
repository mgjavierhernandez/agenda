import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Attendance } from '@/api/types';

export function useAttendance(id: string) {
  return useQuery<Attendance>({
    queryKey: ['attendances', id],
    queryFn: () => apiClient.get(`/attendance/${id}`),
    enabled: !!id,
  });
}
