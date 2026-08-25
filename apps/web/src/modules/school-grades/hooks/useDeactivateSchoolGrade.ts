import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { SchoolGrade } from '@/api/types';

export function useDeactivateSchoolGrade() {
  const queryClient = useQueryClient();

  return useMutation<SchoolGrade, Error, string>({
    mutationFn: (id) => apiClient.patch(`/school-grades/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-grades'] });
    },
  });
}
