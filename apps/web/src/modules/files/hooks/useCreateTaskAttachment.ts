import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TaskAttachment } from '@/api/types';

export function useCreateTaskAttachment() {
  const queryClient = useQueryClient();

  return useMutation<TaskAttachment, Error, { taskId: string; fileAssetId: string }>({
    mutationFn: ({ taskId, fileAssetId }) =>
      apiClient.post<TaskAttachment>(`/tasks/${taskId}/attachments`, { fileAssetId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', variables.taskId] });
    },
  });
}
