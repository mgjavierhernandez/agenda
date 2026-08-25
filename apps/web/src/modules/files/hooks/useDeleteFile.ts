import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: (fileId: string) => apiClient.delete<{ message: string }>(`/files/${fileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments'] });
      queryClient.invalidateQueries({ queryKey: ['communication-attachments'] });
    },
  });
}
