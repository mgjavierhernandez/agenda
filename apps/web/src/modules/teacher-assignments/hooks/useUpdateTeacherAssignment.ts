import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TeacherAssignment, UpdateTeacherAssignmentInput } from '@/api/types';

export function useUpdateTeacherAssignment() {
  const queryClient = useQueryClient();

  return useMutation<TeacherAssignment, Error, { id: string; data: UpdateTeacherAssignmentInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/teacher-assignments/${id}`, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments', variables.id] });
    },
  });
}
