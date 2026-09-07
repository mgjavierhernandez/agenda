import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreateAreaInput, Area } from '@/api/types';

export function useCreateArea() {
  const queryClient = useQueryClient();

  return useMutation<Area, Error, CreateAreaInput>({
    mutationFn: (data) => apiClient.post('/areas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
  });
}