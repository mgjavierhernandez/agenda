import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { StudentFollowUp, CreateStudentFollowUpInput } from '@/api/types';

export function useCreateStudentFollowUp() {
  const queryClient = useQueryClient();
  return useMutation<StudentFollowUp, Error, CreateStudentFollowUpInput>({
    mutationFn: (data) => apiClient.post('/student-follow-ups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-follow-ups'] });
    },
  });
}
