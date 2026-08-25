import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { SignatureRequest, CreateSignatureRequestInput } from '@/api/types';

export function useCreateSignature() {
  const queryClient = useQueryClient();

  return useMutation<SignatureRequest, Error, CreateSignatureRequestInput>({
    mutationFn: (data) => apiClient.post('/signature-requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
    },
  });
}
