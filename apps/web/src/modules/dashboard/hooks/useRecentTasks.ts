import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Task } from '@/api/types';

export function useRecentTasks(enabled: boolean, studentId?: string | null) {
  return useQuery<PaginatedApiResponse<Task>>({
    queryKey: ['dashboard-recent-tasks', studentId],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '5' });
      if (studentId) params.set('studentId', studentId);
      return apiClient.get(`/tasks?${params.toString()}`);
    },
    enabled,
    select: (data) => ({
      ...data,
      data: data.data.filter((t) => t.status !== 'INACTIVE').slice(0, 5),
    }),
  });
}
