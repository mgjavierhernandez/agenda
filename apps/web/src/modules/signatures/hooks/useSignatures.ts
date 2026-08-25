import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, SignatureRequest, ListSignatureRequestsParams } from '@/api/types';

export function useSignatures(params: ListSignatureRequestsParams = {}) {
  const { page = 1, limit = 20, search, status, dueDateFrom, dueDateTo, recipientUserId } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);
  if (status) searchParams.set('status', status);
  if (dueDateFrom) searchParams.set('dueDateFrom', dueDateFrom);
  if (dueDateTo) searchParams.set('dueDateTo', dueDateTo);
  if (recipientUserId) searchParams.set('recipientUserId', recipientUserId);

  return useQuery<PaginatedApiResponse<SignatureRequest>>({
    queryKey: ['signature-requests', { page, limit, search, status, dueDateFrom, dueDateTo, recipientUserId }],
    queryFn: () => apiClient.get(`/signature-requests?${searchParams.toString()}`),
  });
}
