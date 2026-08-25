import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Enrollment, UpdateEnrollmentInput } from '@/api/types';

export function useUpdateEnrollment() {
  const queryClient = useQueryClient();

  return useMutation<Enrollment, Error, { id: string; data: UpdateEnrollmentInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/enrollments/${id}`, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments', variables.id] });
    },
  });
}
