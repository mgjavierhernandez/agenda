import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, GuardianStudentWithStudent, ListGuardiansParams } from '@/api/types';

export function useGuardianStudents(params: ListGuardiansParams = {}) {
  const { page = 1, limit = 20, search } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);

  return useQuery<PaginatedApiResponse<GuardianStudentWithStudent>>({
    queryKey: ['guardian-students', { page, limit, search }],
    queryFn: () => apiClient.get(`/guardians/students?${searchParams.toString()}`),
  });
}
