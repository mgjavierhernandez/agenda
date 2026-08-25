import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { SchoolGrade, UpdateSchoolGradeInput } from '@/api/types';

export function useUpdateSchoolGrade() {
  const queryClient = useQueryClient();

  return useMutation<SchoolGrade, Error, { id: string; data: UpdateSchoolGradeInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/school-grades/${id}`, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['school-grades'] });
      queryClient.invalidateQueries({ queryKey: ['school-grades', variables.id] });
    },
  });
}
