import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Communication } from '@/api/types';

export function useDeactivateCommunication() {
  const queryClient = useQueryClient();

  return useMutation<Communication, Error, string>({
    mutationFn: (id) => apiClient.patch(`/communications/${id}/deactivate`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      queryClient.invalidateQueries({ queryKey: ['communications', id] });
    },
  });
}
