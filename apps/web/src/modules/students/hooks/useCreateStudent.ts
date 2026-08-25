import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreateStudentInput, Student } from '@/api/types';

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation<Student, Error, CreateStudentInput>({
    mutationFn: (data) => apiClient.post('/students', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
