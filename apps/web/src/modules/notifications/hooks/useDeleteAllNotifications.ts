import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation<{ count: number }, Error, void>({
    mutationFn: () => apiClient.delete('/notifications'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
