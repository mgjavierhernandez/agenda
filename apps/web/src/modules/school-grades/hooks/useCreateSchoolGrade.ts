import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { SchoolGrade, CreateSchoolGradeInput } from '@/api/types';

export function useCreateSchoolGrade() {
  const queryClient = useQueryClient();

  return useMutation<SchoolGrade, Error, CreateSchoolGradeInput>({
    mutationFn: (data) => apiClient.post('/school-grades', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-grades'] });
    },
  });
}
