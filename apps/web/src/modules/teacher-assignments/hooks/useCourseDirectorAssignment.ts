import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CourseDirectorAssignment } from '@/api/types';

export function useCourseDirectorAssignment(id: string) {
  return useQuery<CourseDirectorAssignment>({
    queryKey: ['course-director-assignment', id],
    queryFn: () => apiClient.get(`/teacher-assignments/course-directors/${id}`),
    enabled: !!id,
  });
}
