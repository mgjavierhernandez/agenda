import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  PaginatedApiResponse,
  StudentFollowUp,
  ListStudentFollowUpsParams,
} from '@/api/types';

export function useStudentFollowUps(params: ListStudentFollowUpsParams = {}) {
  const {
    page = 1,
    limit = 20,
    search,
    studentId,
    type,
    severity,
    status,
    confidentiality,
    categoryId,
    createdById,
    createdFrom,
    createdTo,
  } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);
  if (studentId) searchParams.set('studentId', studentId);
  if (type) searchParams.set('type', type);
  if (severity) searchParams.set('severity', severity);
  if (status) searchParams.set('status', status);
  if (confidentiality) searchParams.set('confidentiality', confidentiality);
  if (categoryId) searchParams.set('categoryId', categoryId);
  if (createdById) searchParams.set('createdById', createdById);
  if (createdFrom) searchParams.set('createdFrom', createdFrom);
  if (createdTo) searchParams.set('createdTo', createdTo);

  return useQuery<PaginatedApiResponse<StudentFollowUp>>({
    queryKey: [
      'student-follow-ups',
      {
        page,
        limit,
        search,
        studentId,
        type,
        severity,
        status,
        confidentiality,
        categoryId,
        createdById,
        createdFrom,
        createdTo,
      },
    ],
    queryFn: () => apiClient.get(`/student-follow-ups?${searchParams.toString()}`),
  });
}
