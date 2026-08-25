import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { SignatureRequest } from '@/api/types';

export function usePublishSignature() {
  const queryClient = useQueryClient();

  return useMutation<SignatureRequest, Error, string>({
    mutationFn: (id) => apiClient.patch(`/signature-requests/${id}/publish`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['signature-requests', id] });
    },
  });
}
