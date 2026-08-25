import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Notification } from '@/api/types';

export function useRecentNotifications(enabled: boolean) {
  return useQuery<PaginatedApiResponse<Notification>>({
    queryKey: ['dashboard-recent-notifications'],
    queryFn: () => apiClient.get('/notifications?limit=5'),
    enabled,
    select: (data) => ({
      ...data,
      data: data.data.slice(0, 5),
    }),
  });
}
