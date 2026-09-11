import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  PaginatedApiResponse,
  CourseDirectorAssignment,
  ListCourseDirectorAssignmentsParams,
} from '@/api/types';

export function useCourseDirectorAssignments(params: ListCourseDirectorAssignmentsParams = {}) {
  const { page = 1, limit = 20, directorUserId, courseId, academicPeriodId } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (directorUserId) searchParams.set('directorUserId', directorUserId);
  if (courseId) searchParams.set('courseId', courseId);
  if (academicPeriodId) searchParams.set('academicPeriodId', academicPeriodId);

  return useQuery<PaginatedApiResponse<CourseDirectorAssignment>>({
    queryKey: [
      'course-director-assignments',
      { page, limit, directorUserId, courseId, academicPeriodId },
    ],
    queryFn: () =>
      apiClient.get(`/teacher-assignments/course-directors?${searchParams.toString()}`),
  });
}
