import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { SchoolGrade } from '@/api/types';

export function useSchoolGrade(id: string) {
  return useQuery<SchoolGrade>({
    queryKey: ['school-grades', id],
    queryFn: () => apiClient.get(`/school-grades/${id}`),
    enabled: !!id,
  });
}
