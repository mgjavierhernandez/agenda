import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation<{ count: number }, Error, void>({
    mutationFn: () => apiClient.patch('/notifications'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
