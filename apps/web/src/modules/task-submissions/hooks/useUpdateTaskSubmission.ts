import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UpdateTaskSubmissionInput, TaskSubmission } from '@/api/types';

export function useUpdateTaskSubmission() {
  const queryClient = useQueryClient();

  return useMutation<
    TaskSubmission,
    Error,
    { assignmentId: string; data: UpdateTaskSubmissionInput }
  >({
    mutationFn: ({ assignmentId, data }) =>
      apiClient.patch(`/task-assignments/${assignmentId}/submission`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-submissions', variables.assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['task-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
