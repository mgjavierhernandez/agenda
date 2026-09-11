import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Enrollment, ListEnrollmentsParams } from '@/api/types';

export function useEnrollments(params: ListEnrollmentsParams = {}) {
  const { page = 1, limit = 20, studentId, courseId, schoolGradeId, academicPeriodId } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (studentId) searchParams.set('studentId', studentId);
  if (courseId) searchParams.set('courseId', courseId);
  if (schoolGradeId) searchParams.set('schoolGradeId', schoolGradeId);
  if (academicPeriodId) searchParams.set('academicPeriodId', academicPeriodId);

  return useQuery<PaginatedApiResponse<Enrollment>>({
    queryKey: [
      'enrollments',
      { page, limit, studentId, courseId, schoolGradeId, academicPeriodId },
    ],
    queryFn: () => apiClient.get(`/enrollments?${searchParams.toString()}`),
  });
}
