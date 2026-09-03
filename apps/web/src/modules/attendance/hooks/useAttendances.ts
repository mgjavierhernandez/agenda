import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Attendance, ListAttendancesParams } from '@/api/types';

export function useAttendances(params: ListAttendancesParams = {}) {
  const {
    page = 1,
    limit = 20,
    studentId,
    courseId,
    academicPeriodId,
    date,
    dateFrom,
    dateTo,
    status,
  } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (studentId) searchParams.set('studentId', studentId);
  if (courseId) searchParams.set('courseId', courseId);
  if (academicPeriodId) searchParams.set('academicPeriodId', academicPeriodId);
  if (date) searchParams.set('date', date);
  if (dateFrom) searchParams.set('dateFrom', dateFrom);
  if (dateTo) searchParams.set('dateTo', dateTo);
  if (status) searchParams.set('status', status);

  return useQuery<PaginatedApiResponse<Attendance>>({
    queryKey: [
      'attendances',
      { page, limit, studentId, courseId, academicPeriodId, date, dateFrom, dateTo, status },
    ],
    queryFn: () => apiClient.get(`/attendance?${searchParams.toString()}`),
  });
}
