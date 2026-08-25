import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { AcademicPeriod } from '@/api/types';

export function useAcademicPeriod(id: string) {
  return useQuery<AcademicPeriod>({
    queryKey: ['academic-periods', id],
    queryFn: () => apiClient.get(`/academic-periods/${id}`),
    enabled: !!id,
  });
}
