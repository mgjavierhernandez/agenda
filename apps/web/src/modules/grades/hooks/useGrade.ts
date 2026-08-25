import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Grade } from '@/api/types';

export function useGrade(id: string) {
  return useQuery<Grade>({
    queryKey: ['grades', id],
    queryFn: () => apiClient.get(`/grades/${id}`),
    enabled: !!id,
  });
}
