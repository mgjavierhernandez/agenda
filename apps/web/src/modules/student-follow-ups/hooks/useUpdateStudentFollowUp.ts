import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { StudentFollowUp, UpdateStudentFollowUpInput } from '@/api/types';

export function useUpdateStudentFollowUp() {
  const queryClient = useQueryClient();
  return useMutation<StudentFollowUp, Error, { id: string; data: UpdateStudentFollowUpInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/student-follow-ups/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['student-follow-ups', variables.id] });
    },
  });
}
