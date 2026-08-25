import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { SignatureRequest } from '@/api/types';

export function useDeactivateSignature() {
  const queryClient = useQueryClient();

  return useMutation<SignatureRequest, Error, string>({
    mutationFn: (id) => apiClient.patch(`/signature-requests/${id}/deactivate`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['signature-requests', id] });
    },
  });
}
