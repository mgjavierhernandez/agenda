import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, CommunicationRecipient, ListCommunicationRecipientsParams } from '@/api/types';

export function useCommunicationRecipients(params: ListCommunicationRecipientsParams = {}) {
  const { page = 1, limit = 20, status } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (status) searchParams.set('status', status);

  return useQuery<PaginatedApiResponse<CommunicationRecipient>>({
    queryKey: ['communication-recipients', { page, limit, status }],
    queryFn: () => apiClient.get(`/communication-recipients?${searchParams.toString()}`),
  });
}
