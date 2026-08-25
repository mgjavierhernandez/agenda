import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TeacherAssignment } from '@/api/types';

export function useDeactivateTeacherAssignment() {
  const queryClient = useQueryClient();

  return useMutation<TeacherAssignment, Error, string>({
    mutationFn: (id) => apiClient.patch(`/teacher-assignments/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
    },
  });
}
