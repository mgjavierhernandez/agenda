import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, FollowUpEntry } from '@/api/types';

export function useFollowUpEntries(followUpId: string, page = 1, limit = 50) {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));

  return useQuery<PaginatedApiResponse<FollowUpEntry>>({
    queryKey: ['student-follow-up-entries', followUpId, { page, limit }],
    queryFn: () =>
      apiClient.get(`/student-follow-ups/${followUpId}/entries?${searchParams.toString()}`),
    enabled: !!followUpId,
  });
}
