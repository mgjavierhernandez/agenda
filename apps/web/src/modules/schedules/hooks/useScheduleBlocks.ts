import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  PaginatedApiResponse,
  ScheduleBlock,
  CreateScheduleBlockInput,
  DayOfWeek,
} from '@/api/types';

export interface ListScheduleBlocksParams {
  page?: number;
  limit?: number;
  search?: string;
  dayOfWeek?: DayOfWeek;
  status?: 'ACTIVE' | 'INACTIVE';
}

export function useScheduleBlocks(params: ListScheduleBlocksParams = {}) {
  const { page = 1, limit = 100, search, dayOfWeek, status } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  if (search) searchParams.set('search', search);
  if (dayOfWeek) searchParams.set('dayOfWeek', dayOfWeek);
  if (status) searchParams.set('status', status);

  return useQuery<PaginatedApiResponse<ScheduleBlock>>({
    queryKey: ['schedule-blocks', { page, limit, search, dayOfWeek, status }],
    queryFn: () => apiClient.get(`/schedule-blocks?${searchParams.toString()}`),
  });
}

export function useCreateScheduleBlock() {
  const queryClient = useQueryClient();

  return useMutation<ScheduleBlock, Error, CreateScheduleBlockInput>({
    mutationFn: (input) => apiClient.post<ScheduleBlock>('/schedule-blocks', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-blocks'] });
    },
  });
}

export function useDeactivateScheduleBlock() {
  const queryClient = useQueryClient();

  return useMutation<ScheduleBlock, Error, string>({
    mutationFn: (id) => apiClient.patch<ScheduleBlock>(`/schedule-blocks/${id}/deactivate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-blocks'] });
    },
  });
}
