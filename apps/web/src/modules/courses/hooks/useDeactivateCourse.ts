import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Course } from '@/api/types';

export function useDeactivateCourse() {
  const queryClient = useQueryClient();

  return useMutation<Course, Error, string>({
    mutationFn: (id) => apiClient.patch(`/courses/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}
