import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { StudentFollowUp } from '@/api/types';

export function useStudentFollowUp(id: string) {
  return useQuery<StudentFollowUp>({
    queryKey: ['student-follow-ups', id],
    queryFn: () => apiClient.get(`/student-follow-ups/${id}`),
    enabled: !!id,
  });
}
