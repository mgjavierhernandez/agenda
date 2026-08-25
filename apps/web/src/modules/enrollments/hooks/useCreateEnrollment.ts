import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Enrollment, CreateEnrollmentInput } from '@/api/types';

export function useCreateEnrollment() {
  const queryClient = useQueryClient();

  return useMutation<Enrollment, Error, CreateEnrollmentInput>({
    mutationFn: (data) => apiClient.post('/enrollments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}
