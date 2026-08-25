import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useDeleteTaskAttachment() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, { taskId: string; attachmentId: string }>({
    mutationFn: ({ taskId, attachmentId }) =>
      apiClient.delete<{ success: boolean }>(`/tasks/${taskId}/attachments/${attachmentId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', variables.taskId] });
    },
  });
}
