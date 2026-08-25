import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, AcademicPeriod, ListAcademicPeriodsParams } from '@/api/types';

export function useAcademicPeriods(params: ListAcademicPeriodsParams = {}) {
  const { page = 1, limit = 20, search } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);

  return useQuery<PaginatedApiResponse<AcademicPeriod>>({
    queryKey: ['academic-periods', { page, limit, search }],
    queryFn: () => apiClient.get(`/academic-periods?${searchParams.toString()}`),
  });
}
