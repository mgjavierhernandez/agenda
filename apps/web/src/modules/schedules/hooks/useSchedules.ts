import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Schedule, ListSchedulesParams } from '@/api/types';

export function useSchedules(params: ListSchedulesParams = {}) {
  const {
    page = 1,
    limit = 20,
    search,
    status,
    courseId,
    subjectId,
    dayOfWeek,
    studentId,
  } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);
  if (status) searchParams.set('status', status);
  if (courseId) searchParams.set('courseId', courseId);
  if (subjectId) searchParams.set('subjectId', subjectId);
  if (dayOfWeek) searchParams.set('dayOfWeek', dayOfWeek);
  if (studentId) searchParams.set('studentId', studentId);

  return useQuery<PaginatedApiResponse<Schedule>>({
    queryKey: [
      'schedules',
      { page, limit, search, status, courseId, subjectId, dayOfWeek, studentId },
    ],
    queryFn: () => apiClient.get(`/schedules?${searchParams.toString()}`),
  });
}
