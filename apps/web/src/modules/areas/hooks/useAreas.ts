import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Area, ListAreasParams } from '@/api/types';

export function useAreas(params: ListAreasParams = {}) {
  const { page = 1, limit = 20, search } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);

  return useQuery<PaginatedApiResponse<Area>>({
    queryKey: ['areas', { page, limit, search }],
    queryFn: () => apiClient.get(`/areas?${searchParams.toString()}`),
  });
}
