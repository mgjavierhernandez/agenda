import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Role } from '@/api/types';

export function useRoles() {
  return useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => apiClient.get<Role[]>('/roles'),
  });
}
