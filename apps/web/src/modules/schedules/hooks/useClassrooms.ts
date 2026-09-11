import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  PaginatedApiResponse,
  Classroom,
  CreateClassroomInput,
  ClassroomType,
} from '@/api/types';

export interface ListClassroomsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: ClassroomType;
  status?: 'ACTIVE' | 'INACTIVE';
}

export function useClassrooms(params: ListClassroomsParams = {}) {
  const { page = 1, limit = 100, search, type, status } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);
  if (type) searchParams.set('type', type);
  if (status) searchParams.set('status', status);

  return useQuery<PaginatedApiResponse<Classroom>>({
    queryKey: ['classrooms', { page, limit, search, type, status }],
    queryFn: () => apiClient.get(`/classrooms?${searchParams.toString()}`),
  });
}

export function useCreateClassroom() {
  const queryClient = useQueryClient();

  return useMutation<Classroom, Error, CreateClassroomInput>({
    mutationFn: (input) => apiClient.post<Classroom>('/classrooms', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
}

export function useDeactivateClassroom() {
  const queryClient = useQueryClient();

  return useMutation<Classroom, Error, string>({
    mutationFn: (id) => apiClient.patch<Classroom>(`/classrooms/${id}/deactivate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
}
