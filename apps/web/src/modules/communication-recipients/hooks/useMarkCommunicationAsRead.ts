import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useMarkCommunicationAsRead() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => apiClient.patch(`/communication-recipients/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['communication-recipients-unread-count'] });
    },
  });
}
