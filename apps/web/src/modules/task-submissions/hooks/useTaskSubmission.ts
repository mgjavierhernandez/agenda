import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TaskSubmission } from '@/api/types';

export function useTaskSubmission(assignmentId: string) {
  return useQuery<TaskSubmission>({
    queryKey: ['task-submissions', assignmentId],
    queryFn: () => apiClient.get(`/task-assignments/${assignmentId}/submission`),
    enabled: !!assignmentId,
  });
}
