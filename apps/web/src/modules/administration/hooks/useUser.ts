import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { User } from '@/api/types';

export function useUser(institutionId: string | null, userId: string | undefined) {
  return useQuery<User, Error>({
    queryKey: ['user', institutionId, userId],
    queryFn: () => apiClient.get<User>(`/users/${userId}`),
    enabled: !!institutionId && !!userId,
  });
}
