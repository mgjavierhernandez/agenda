import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Task, ListTasksParams } from '@/api/types';

export function useTasks(params: ListTasksParams = {}) {
  const { page = 1, limit = 20, search, status, courseId, subjectId, dueDateFrom, dueDateTo } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);
  if (status) searchParams.set('status', status);
  if (courseId) searchParams.set('courseId', courseId);
  if (subjectId) searchParams.set('subjectId', subjectId);
  if (dueDateFrom) searchParams.set('dueDateFrom', dueDateFrom);
  if (dueDateTo) searchParams.set('dueDateTo', dueDateTo);

  return useQuery<PaginatedApiResponse<Task>>({
    queryKey: ['tasks', { page, limit, search, status, courseId, subjectId, dueDateFrom, dueDateTo }],
    queryFn: () => apiClient.get(`/tasks?${searchParams.toString()}`),
  });
}
