import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Notification } from '@/api/types';

export function useNotification(id: string) {
  return useQuery<Notification>({
    queryKey: ['notifications', id],
    queryFn: () => apiClient.get(`/notifications/${id}`),
    enabled: !!id,
  });
}
