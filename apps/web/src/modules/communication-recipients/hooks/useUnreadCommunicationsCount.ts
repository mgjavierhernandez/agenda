import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UnreadCountResponse } from '@/api/types';

export function useUnreadCommunicationsCount() {
  return useQuery<UnreadCountResponse>({
    queryKey: ['communication-recipients-unread-count'],
    queryFn: () => apiClient.get('/communication-recipients/unread-count'),
    refetchInterval: 30000,
  });
}
