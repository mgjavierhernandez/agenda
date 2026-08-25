import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Task } from '@/api/types';

export function useRecentTasks(enabled: boolean) {
  return useQuery<PaginatedApiResponse<Task>>({
    queryKey: ['dashboard-recent-tasks'],
    queryFn: () => apiClient.get('/tasks?limit=5'),
    enabled,
    select: (data) => ({
      ...data,
      data: data.data.filter((t) => t.status !== 'INACTIVE').slice(0, 5),
    }),
  });
}
