import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Course, ListCoursesParams } from '@/api/types';

export function useCourses(params: ListCoursesParams = {}) {
  const { page = 1, limit = 20, search, status } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);
  if (status) searchParams.set('status', status);

  return useQuery<PaginatedApiResponse<Course>>({
    queryKey: ['courses', { page, limit, search, status }],
    queryFn: () => apiClient.get(`/courses?${searchParams.toString()}`),
  });
}
