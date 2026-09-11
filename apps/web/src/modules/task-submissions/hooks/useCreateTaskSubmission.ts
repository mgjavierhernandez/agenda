import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreateTaskSubmissionInput, TaskSubmission } from '@/api/types';

export function useCreateTaskSubmission() {
  const queryClient = useQueryClient();

  return useMutation<
    TaskSubmission,
    Error,
    { assignmentId: string; data: CreateTaskSubmissionInput }
  >({
    mutationFn: ({ assignmentId, data }) =>
      apiClient.post(`/task-assignments/${assignmentId}/submission`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-submissions', variables.assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['task-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
