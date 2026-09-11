import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TeacherSummary } from '@/api/types';

export function useTeachers() {
  return useQuery<TeacherSummary[]>({
    queryKey: ['teacher-assignments', 'teachers'],
    queryFn: () => apiClient.get('/teacher-assignments/teachers'),
  });
}
