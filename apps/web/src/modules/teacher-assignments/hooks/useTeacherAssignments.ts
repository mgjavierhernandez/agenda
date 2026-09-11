import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  PaginatedApiResponse,
  TeacherAssignment,
  ListTeacherAssignmentsParams,
} from '@/api/types';

export function useTeacherAssignments(params: ListTeacherAssignmentsParams = {}) {
  const { page = 1, limit = 20, teacherUserId, courseId, subjectId, academicPeriodId } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (teacherUserId) searchParams.set('teacherUserId', teacherUserId);
  if (courseId) searchParams.set('courseId', courseId);
  if (subjectId) searchParams.set('subjectId', subjectId);
  if (academicPeriodId) searchParams.set('academicPeriodId', academicPeriodId);

  return useQuery<PaginatedApiResponse<TeacherAssignment>>({
    queryKey: [
      'teacher-assignments',
      { page, limit, teacherUserId, courseId, subjectId, academicPeriodId },
    ],
    queryFn: () => apiClient.get(`/teacher-assignments?${searchParams.toString()}`),
  });
}
