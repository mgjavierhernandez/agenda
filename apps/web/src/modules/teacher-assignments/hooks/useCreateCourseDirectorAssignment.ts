import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CourseDirectorAssignment, CreateCourseDirectorAssignmentInput } from '@/api/types';

export function useCreateCourseDirectorAssignment() {
  const queryClient = useQueryClient();

  return useMutation<CourseDirectorAssignment, Error, CreateCourseDirectorAssignmentInput>({
    mutationFn: (input) => apiClient.post('/teacher-assignments/course-directors', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-director-assignments'] });
    },
  });
}
