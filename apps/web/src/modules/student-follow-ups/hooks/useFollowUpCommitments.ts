import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Commitment } from '@/api/types';

export function useFollowUpCommitments(followUpId: string, page = 1, limit = 50) {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));

  return useQuery<PaginatedApiResponse<Commitment>>({
    queryKey: ['student-follow-up-commitments', followUpId, { page, limit }],
    queryFn: () =>
      apiClient.get(`/student-follow-ups/${followUpId}/commitments?${searchParams.toString()}`),
    enabled: !!followUpId,
  });
}
