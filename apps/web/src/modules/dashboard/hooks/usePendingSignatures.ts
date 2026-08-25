import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, SignatureRequest } from '@/api/types';

export function usePendingSignatures(enabled: boolean) {
  return useQuery<PaginatedApiResponse<SignatureRequest>>({
    queryKey: ['dashboard-pending-signatures'],
    queryFn: () => apiClient.get('/signature-requests?status=PUBLISHED&limit=5'),
    enabled,
    select: (data) => ({
      ...data,
      data: data.data.slice(0, 5),
    }),
  });
}
