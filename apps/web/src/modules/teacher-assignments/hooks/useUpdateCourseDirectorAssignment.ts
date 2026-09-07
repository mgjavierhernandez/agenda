import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CourseDirectorAssignment, UpdateCourseDirectorAssignmentInput } from '@/api/types';

export function useUpdateCourseDirectorAssignment() {
  const queryClient = useQueryClient();

  return useMutation<CourseDirectorAssignment, Error, { id: string; data: UpdateCourseDirectorAssignmentInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/teacher-assignments/course-directors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-director-assignments'] });
    },
  });
}