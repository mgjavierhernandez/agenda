import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Notification, ListNotificationsParams } from '@/api/types';

export interface NotificationsListResponse extends PaginatedApiResponse<Notification> {
  unreadCount: number;
}

export function useNotifications(params: ListNotificationsParams = {}) {
  const { page = 1, limit = 20, search, status, type, createdFrom, createdTo } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);
  if (status) searchParams.set('status', status);
  if (type) searchParams.set('type', type);
  if (createdFrom) searchParams.set('createdFrom', createdFrom);
  if (createdTo) searchParams.set('createdTo', createdTo);

  return useQuery<NotificationsListResponse>({
    queryKey: ['notifications', { page, limit, search, status, type, createdFrom, createdTo }],
    queryFn: () => apiClient.get(`/notifications?${searchParams.toString()}`),
  });
}
