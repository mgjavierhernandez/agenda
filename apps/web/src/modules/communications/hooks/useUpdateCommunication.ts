import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Communication, UpdateCommunicationInput } from '@/api/types';

export function useUpdateCommunication() {
  const queryClient = useQueryClient();

  return useMutation<Communication, Error, { id: string; data: UpdateCommunicationInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/communications/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      queryClient.invalidateQueries({ queryKey: ['communications', id] });
    },
  });
}
