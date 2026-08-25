import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Enrollment } from '@/api/types';

export function useDeactivateEnrollment() {
  const queryClient = useQueryClient();

  return useMutation<Enrollment, Error, string>({
    mutationFn: (id) => apiClient.patch(`/enrollments/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}
