import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Student, ListStudentsParams } from '@/api/types';

export function useStudents(params: ListStudentsParams = {}) {
  const { page = 1, limit = 20, search } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);

  return useQuery<PaginatedApiResponse<Student>>({
    queryKey: ['students', { page, limit, search }],
    queryFn: () => apiClient.get(`/students?${searchParams.toString()}`),
  });
}
