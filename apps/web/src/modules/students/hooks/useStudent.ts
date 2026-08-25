import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Student } from '@/api/types';

export function useStudent(id: string) {
  return useQuery<Student>({
    queryKey: ['students', id],
    queryFn: () => apiClient.get(`/students/${id}`),
    enabled: !!id,
  });
}
