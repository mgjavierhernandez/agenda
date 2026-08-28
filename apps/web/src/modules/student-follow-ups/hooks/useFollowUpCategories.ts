import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { StudentFollowUpCategory } from '@/api/types';

export function useFollowUpCategories() {
  return useQuery<StudentFollowUpCategory[]>({
    queryKey: ['student-follow-up-categories'],
    queryFn: () => apiClient.get('/student-follow-ups/categories'),
  });
}
