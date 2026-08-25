import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreateSubjectInput, Subject } from '@/api/types';

export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation<Subject, Error, CreateSubjectInput>({
    mutationFn: (data) => apiClient.post('/subjects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}
