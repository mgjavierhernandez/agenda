import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Subject, ListSubjectsParams } from '@/api/types';

export function useSubjects(params: ListSubjectsParams = {}) {
  const { page = 1, limit = 20, search, status } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);
  if (status) searchParams.set('status', status);

  return useQuery<PaginatedApiResponse<Subject>>({
    queryKey: ['subjects', { page, limit, search, status }],
    queryFn: () => apiClient.get(`/subjects?${searchParams.toString()}`),
  });
}
