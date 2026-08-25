import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Communication, CreateCommunicationInput } from '@/api/types';

export function useCreateCommunication() {
  const queryClient = useQueryClient();

  return useMutation<Communication, Error, CreateCommunicationInput>({
    mutationFn: (data) => apiClient.post('/communications', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
  });
}
