import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Communication, ListCommunicationsParams } from '@/api/types';

export function useCommunications(params: ListCommunicationsParams = {}) {
  const { page = 1, limit = 20, status, audience, search } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (status) searchParams.set('status', status);
  if (audience) searchParams.set('audience', audience);
  if (search) searchParams.set('search', search);

  return useQuery<PaginatedApiResponse<Communication>>({
    queryKey: ['communications', { page, limit, status, audience, search }],
    queryFn: () => apiClient.get(`/communications?${searchParams.toString()}`),
  });
}
