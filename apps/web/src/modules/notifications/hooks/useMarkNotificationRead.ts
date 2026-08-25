import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Notification } from '@/api/types';

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation<Notification, Error, string>({
    mutationFn: (id) => apiClient.patch(`/notifications/${id}`, { status: 'READ' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
