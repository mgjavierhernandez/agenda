import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TaskAssignment } from '@/api/types';

export function useDeactivateTaskAssignment() {
  const queryClient = useQueryClient();

  return useMutation<TaskAssignment, Error, string>({
    mutationFn: (id) => apiClient.patch(`/task-assignments/${id}/deactivate`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['task-assignments', id] });
    },
  });
}
