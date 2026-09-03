import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Institution } from '@/api/types';

export function useInstitution(institutionId: string | null | undefined) {
  return useQuery<Institution>({
    queryKey: ['institution', institutionId],
    queryFn: () => apiClient.get<Institution>(`/institutions/${institutionId}`),
    enabled: !!institutionId,
  });
}
