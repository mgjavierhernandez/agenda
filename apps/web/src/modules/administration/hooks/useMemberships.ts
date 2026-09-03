import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, UserMembership, ListMembershipsParams } from '@/api/types';

export function useMemberships(
  institutionId: string | null | undefined,
  params: ListMembershipsParams = {},
) {
  const { page = 1, limit = 20, search, status } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);
  if (status) searchParams.set('status', status);

  return useQuery<PaginatedApiResponse<UserMembership>>({
    queryKey: ['memberships', institutionId, { page, limit, search, status }],
    queryFn: () =>
      apiClient.get<PaginatedApiResponse<UserMembership>>(
        `/institutions/${institutionId}/memberships?${searchParams.toString()}`,
      ),
    enabled: !!institutionId,
  });
}
