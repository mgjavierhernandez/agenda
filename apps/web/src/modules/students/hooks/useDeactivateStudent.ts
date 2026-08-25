import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Student } from '@/api/types';

export function useDeactivateStudent() {
  const queryClient = useQueryClient();

  return useMutation<Student, Error, string>({
    mutationFn: (id) => apiClient.patch(`/students/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
