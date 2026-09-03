import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { StudentReport, CourseReport } from '@/api/types';

export function useStudentReport(studentId?: string, academicPeriodId?: string) {
  const enabled = !!studentId;
  const searchParams = new URLSearchParams();
  if (academicPeriodId) searchParams.set('academicPeriodId', academicPeriodId);
  const query = searchParams.toString();

  return useQuery<StudentReport>({
    queryKey: ['student-report', studentId, academicPeriodId],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () => apiClient.get(`/reports/students/${studentId}${query ? `?${query}` : ''}`),
  });
}

export function useStudentBulletin(studentId?: string, academicPeriodId?: string) {
  const enabled = !!studentId;
  const searchParams = new URLSearchParams();
  if (academicPeriodId) searchParams.set('academicPeriodId', academicPeriodId);
  const query = searchParams.toString();

  return useQuery<StudentReport>({
    queryKey: ['student-bulletin', studentId, academicPeriodId],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () => apiClient.get(`/reports/students/${studentId}/bulletin${query ? `?${query}` : ''}`),
  });
}

export function useCourseReport(courseId?: string, academicPeriodId?: string) {
  const enabled = !!courseId;
  const searchParams = new URLSearchParams();
  if (academicPeriodId) searchParams.set('academicPeriodId', academicPeriodId);
  const query = searchParams.toString();

  return useQuery<CourseReport>({
    queryKey: ['course-report', courseId, academicPeriodId],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () => apiClient.get(`/reports/courses/${courseId}${query ? `?${query}` : ''}`),
  });
}