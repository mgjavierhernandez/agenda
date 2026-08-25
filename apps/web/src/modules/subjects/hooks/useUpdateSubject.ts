import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UpdateSubjectInput, Subject } from '@/api/types';

export function useUpdateSubject() {
  const queryClient = useQueryClient();

  return useMutation<Subject, Error, { id: string; data: UpdateSubjectInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/subjects/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['subjects', variables.id] });
    },
  });
}
