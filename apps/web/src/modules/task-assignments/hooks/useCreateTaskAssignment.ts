import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreateTaskAssignmentInput, TaskAssignment } from '@/api/types';

export function useCreateTaskAssignment() {
  const queryClient = useQueryClient();

  return useMutation<TaskAssignment[], Error, CreateTaskAssignmentInput>({
    mutationFn: (data) => apiClient.post('/task-assignments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-assignments'] });
    },
  });
}
