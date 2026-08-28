import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse } from '@/api/types';

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
}

export function useUsers(search?: string) {
  return useQuery<PaginatedApiResponse<UserListItem>>({
    queryKey: ['users', { search: search || '' }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '200');
      params.set('status', 'ACTIVE');
      if (search) params.set('search', search);
      return apiClient.get<PaginatedApiResponse<UserListItem>>(`/users?${params.toString()}`);
    },
  });
}
