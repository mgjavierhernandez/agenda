import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Enrollment } from '@/api/types';

export function useEnrollment(id: string) {
  return useQuery<Enrollment>({
    queryKey: ['enrollments', id],
    queryFn: () => apiClient.get(`/enrollments/${id}`),
    enabled: !!id,
  });
}
