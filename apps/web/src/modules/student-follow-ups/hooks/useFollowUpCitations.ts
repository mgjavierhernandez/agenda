import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  PaginatedApiResponse,
  FollowUpCitation,
  ListFollowUpCitationsParams,
} from '@/api/types';

export function useFollowUpCitations(
  followUpId: string,
  params?: ListFollowUpCitationsParams,
) {
  return useQuery<PaginatedApiResponse<FollowUpCitation>>({
    queryKey: ['student-follow-up-citations', followUpId, params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.status) searchParams.set('status', params.status);
      const qs = searchParams.toString();
      return apiClient.get<PaginatedApiResponse<FollowUpCitation>>(
        `/student-follow-ups/${followUpId}/citations${qs ? `?${qs}` : ''}`,
      );
    },
    enabled: !!followUpId,
  });
}
