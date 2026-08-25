import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { AcademicPeriod, CreateAcademicPeriodInput } from '@/api/types';

export function useCreateAcademicPeriod() {
  const queryClient = useQueryClient();

  return useMutation<AcademicPeriod, Error, CreateAcademicPeriodInput>({
    mutationFn: (data) => apiClient.post('/academic-periods', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-periods'] });
    },
  });
}
