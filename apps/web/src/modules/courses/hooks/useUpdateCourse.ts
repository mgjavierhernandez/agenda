import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UpdateCourseInput, Course } from '@/api/types';

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation<Course, Error, { id: string; data: UpdateCourseInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/courses/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses', variables.id] });
    },
  });
}
