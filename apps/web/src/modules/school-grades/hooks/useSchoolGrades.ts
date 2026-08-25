import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, SchoolGrade, ListSchoolGradesParams } from '@/api/types';

export function useSchoolGrades(params: ListSchoolGradesParams = {}) {
  const { page = 1, limit = 20, search } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);

  return useQuery<PaginatedApiResponse<SchoolGrade>>({
    queryKey: ['school-grades', { page, limit, search }],
    queryFn: () => apiClient.get(`/school-grades?${searchParams.toString()}`),
  });
}
