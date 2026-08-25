import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useMarkAllCommunicationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () => apiClient.patch('/communication-recipients/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['communication-recipients-unread-count'] });
    },
  });
}
