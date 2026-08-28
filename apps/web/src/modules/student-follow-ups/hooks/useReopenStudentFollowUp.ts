import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { StudentFollowUp } from '@/api/types';

export function useReopenStudentFollowUp() {
  const queryClient = useQueryClient();
  return useMutation<StudentFollowUp, Error, string>({
    mutationFn: (id) => apiClient.post(`/student-follow-ups/${id}/reopen`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['student-follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['student-follow-ups', id] });
    },
  });
}
