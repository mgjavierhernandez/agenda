import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Subject } from '@/api/types';

export function useSubject(id: string) {
  return useQuery<Subject>({
    queryKey: ['subjects', id],
    queryFn: () => apiClient.get(`/subjects/${id}`),
    enabled: !!id,
  });
}
