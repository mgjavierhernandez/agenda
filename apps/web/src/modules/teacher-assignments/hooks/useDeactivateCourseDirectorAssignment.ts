import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CourseDirectorAssignment } from '@/api/types';

export function useDeactivateCourseDirectorAssignment() {
  const queryClient = useQueryClient();

  return useMutation<CourseDirectorAssignment, Error, string>({
    mutationFn: (id) => apiClient.patch(`/teacher-assignments/course-directors/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-director-assignments'] });
    },
  });
}