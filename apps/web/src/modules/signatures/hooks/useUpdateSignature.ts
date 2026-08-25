import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { SignatureRequest, UpdateSignatureRequestInput } from '@/api/types';

export function useUpdateSignature() {
  const queryClient = useQueryClient();

  return useMutation<SignatureRequest, Error, { id: string; data: UpdateSignatureRequestInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/signature-requests/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['signature-requests', id] });
    },
  });
}
