import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Task } from '@/api/types';

export function useTask(id: string) {
  return useQuery<Task>({
    queryKey: ['tasks', id],
    queryFn: () => apiClient.get(`/tasks/${id}`),
    enabled: !!id,
  });
}
