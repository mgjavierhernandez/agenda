import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Course } from '@/api/types';

export function useCourse(id: string) {
  return useQuery<Course>({
    queryKey: ['courses', id],
    queryFn: () => apiClient.get(`/courses/${id}`),
    enabled: !!id,
  });
}
