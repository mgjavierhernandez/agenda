import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UpdateGradeInput, Grade } from '@/api/types';

export function useUpdateGrade() {
  const queryClient = useQueryClient();

  return useMutation<Grade, Error, { id: string; data: UpdateGradeInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/grades/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      queryClient.invalidateQueries({ queryKey: ['grades', variables.id] });
    },
  });
}
