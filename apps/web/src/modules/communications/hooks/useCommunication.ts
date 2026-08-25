import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Communication } from '@/api/types';

export function useCommunication(id: string) {
  return useQuery<Communication>({
    queryKey: ['communications', id],
    queryFn: () => apiClient.get(`/communications/${id}`),
    enabled: !!id,
  });
}
