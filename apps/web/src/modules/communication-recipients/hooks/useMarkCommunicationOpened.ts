import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useMarkCommunicationOpened() {
  const queryClient = useQueryClient();

  return useMutation<{ opened: boolean }, Error, string>({
    mutationFn: (communicationId) =>
      apiClient.post(`/communication-recipients/by-communication/${communicationId}/opened`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['communication-recipients-unread-count'] });
    },
  });
}
