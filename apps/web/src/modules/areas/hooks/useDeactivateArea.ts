import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Area } from '@/api/types';

export function useDeactivateArea() {
  const queryClient = useQueryClient();

  return useMutation<Area, Error, string>({
    mutationFn: (id) => apiClient.patch(`/areas/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
  });
}
