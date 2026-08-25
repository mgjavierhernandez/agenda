import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { GradeTaskSubmissionInput, TaskSubmission } from '@/api/types';

export function useGradeTaskSubmission() {
  const queryClient = useQueryClient();

  return useMutation<TaskSubmission, Error, { submissionId: string; data: GradeTaskSubmissionInput }>({
    mutationFn: ({ submissionId, data }) =>
      apiClient.patch(`/submissions/${submissionId}/grade`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['task-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
