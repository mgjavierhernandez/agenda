import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Grade, ListGradesParams } from '@/api/types';

export function useGrades(params: ListGradesParams = {}) {
  const { page = 1, limit = 20, search, status, studentId, courseId, subjectId, period } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);
  if (status) searchParams.set('status', status);
  if (studentId) searchParams.set('studentId', studentId);
  if (courseId) searchParams.set('courseId', courseId);
  if (subjectId) searchParams.set('subjectId', subjectId);
  if (period) searchParams.set('period', period);

  return useQuery<PaginatedApiResponse<Grade>>({
    queryKey: ['grades', { page, limit, search, status, studentId, courseId, subjectId, period }],
    queryFn: () => apiClient.get(`/grades?${searchParams.toString()}`),
  });
}
