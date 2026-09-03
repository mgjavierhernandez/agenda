import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { AcademicPeriod } from '@/api/types';

export function useCloseAcademicPeriod() {
  const queryClient = useQueryClient();

  return useMutation<AcademicPeriod, Error, string>({
    mutationFn: (id) => apiClient.patch(`/academic-periods/${id}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-periods'] });
    },
  });
}
