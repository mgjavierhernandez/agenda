import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TeacherAssignment, CreateTeacherAssignmentInput } from '@/api/types';

export function useCreateTeacherAssignment() {
  const queryClient = useQueryClient();

  return useMutation<TeacherAssignment, Error, CreateTeacherAssignmentInput>({
    mutationFn: (data) => apiClient.post('/teacher-assignments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
    },
  });
}
