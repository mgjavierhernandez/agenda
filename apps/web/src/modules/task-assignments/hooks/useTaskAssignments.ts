import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, TaskAssignment, ListTaskAssignmentsParams } from '@/api/types';

export function useTaskAssignments(params: ListTaskAssignmentsParams = {}) {
  const { page = 1, limit = 20, taskId, studentId, status } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (taskId) searchParams.set('taskId', taskId);
  if (studentId) searchParams.set('studentId', studentId);
  if (status) searchParams.set('status', status);

  return useQuery<PaginatedApiResponse<TaskAssignment>>({
    queryKey: ['task-assignments', { page, limit, taskId, studentId, status }],
    queryFn: () => apiClient.get(`/task-assignments?${searchParams.toString()}`),
  });
}
