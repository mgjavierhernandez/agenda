import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TaskAssignment } from '@/api/types';

export function useTaskAssignment(id: string) {
  return useQuery<TaskAssignment>({
    queryKey: ['task-assignments', id],
    queryFn: () => apiClient.get(`/task-assignments/${id}`),
    enabled: !!id,
  });
}
