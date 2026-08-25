import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TeacherAssignment } from '@/api/types';

export function useTeacherAssignment(id: string) {
  return useQuery<TeacherAssignment>({
    queryKey: ['teacher-assignments', id],
    queryFn: () => apiClient.get(`/teacher-assignments/${id}`),
    enabled: !!id,
  });
}
