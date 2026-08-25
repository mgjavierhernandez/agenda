import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreateCourseInput, Course } from '@/api/types';

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation<Course, Error, CreateCourseInput>({
    mutationFn: (data) => apiClient.post('/courses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}
