import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, User, ListUsersParams } from '@/api/types';

export function useUsers(params: ListUsersParams = {}) {
  const { page = 1, limit = 200, search, status } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);
  if (status) searchParams.set('status', status);

  return useQuery<PaginatedApiResponse<User>>({
    queryKey: ['users', { page, limit, search, status }],
    queryFn: () => apiClient.get(`/users?${searchParams.toString()}`),
  });
}
