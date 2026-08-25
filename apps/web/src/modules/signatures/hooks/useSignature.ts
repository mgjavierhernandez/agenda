import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { SignatureRequest } from '@/api/types';

export function useSignature(id: string) {
  return useQuery<SignatureRequest>({
    queryKey: ['signature-requests', id],
    queryFn: () => apiClient.get(`/signature-requests/${id}`),
    enabled: !!id,
  });
}
