import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Grade } from '@/api/types';

export function useDeactivateGrade() {
  const queryClient = useQueryClient();

  return useMutation<Grade, Error, string>({
    mutationFn: (id) => apiClient.patch(`/grades/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
    },
  });
}
