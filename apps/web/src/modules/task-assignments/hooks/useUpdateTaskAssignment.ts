import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UpdateTaskAssignmentInput, TaskAssignment } from '@/api/types';

export function useUpdateTaskAssignment() {
  const queryClient = useQueryClient();

  return useMutation<TaskAssignment, Error, { id: string; data: UpdateTaskAssignmentInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/task-assignments/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['task-assignments', variables.id] });
    },
  });
}
