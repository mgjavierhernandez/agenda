import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useMarkTaskAssignmentOpened() {
  return useMutation<{ opened: boolean }, Error, string>({
    mutationFn: (id) => apiClient.post(`/task-assignments/${id}/opened`),
  });
}
