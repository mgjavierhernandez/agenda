import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UpdateStudentInput, Student } from '@/api/types';

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation<Student, Error, { id: string; data: UpdateStudentInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/students/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students', variables.id] });
    },
  });
}
