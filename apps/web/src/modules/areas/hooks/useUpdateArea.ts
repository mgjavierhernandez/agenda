import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UpdateAreaInput, Area } from '@/api/types';

export function useUpdateArea() {
  const queryClient = useQueryClient();

  return useMutation<Area, Error, { id: string; data: UpdateAreaInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/areas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
  });
}
