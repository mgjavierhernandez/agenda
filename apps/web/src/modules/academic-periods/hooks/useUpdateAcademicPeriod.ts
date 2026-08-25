import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { AcademicPeriod, UpdateAcademicPeriodInput } from '@/api/types';

export function useUpdateAcademicPeriod() {
  const queryClient = useQueryClient();

  return useMutation<AcademicPeriod, Error, { id: string; data: UpdateAcademicPeriodInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/academic-periods/${id}`, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['academic-periods'] });
      queryClient.invalidateQueries({ queryKey: ['academic-periods', variables.id] });
    },
  });
}
