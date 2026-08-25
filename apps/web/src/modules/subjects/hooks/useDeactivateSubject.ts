import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Subject } from '@/api/types';

export function useDeactivateSubject() {
  const queryClient = useQueryClient();

  return useMutation<Subject, Error, string>({
    mutationFn: (id) => apiClient.patch(`/subjects/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}
