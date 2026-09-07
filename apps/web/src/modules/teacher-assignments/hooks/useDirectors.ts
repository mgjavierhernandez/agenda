import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { GroupDirector } from '@/api/types';

export function useDirectors() {
  return useQuery<GroupDirector[]>({
    queryKey: ['teacher-assignments', 'directories'],
    queryFn: () => apiClient.get('/teacher-assignments/directories'),
  });
}