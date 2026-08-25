import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Task } from '@/api/types';

export function useCloseTask() {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, string>({
    mutationFn: (id) => apiClient.patch(`/tasks/${id}/close`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    },
  });
}
