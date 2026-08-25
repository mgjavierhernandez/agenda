import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreateGradeInput, Grade } from '@/api/types';

export function useCreateGrade() {
  const queryClient = useQueryClient();

  return useMutation<Grade, Error, CreateGradeInput>({
    mutationFn: (data) => apiClient.post('/grades', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
    },
  });
}
