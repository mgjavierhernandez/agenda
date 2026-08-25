import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TaskAttachment } from '@/api/types';

export function useTaskAttachments(taskId: string) {
  return useQuery<TaskAttachment[]>({
    queryKey: ['task-attachments', taskId],
    queryFn: () => apiClient.get<TaskAttachment[]>(`/tasks/${taskId}/attachments`),
    enabled: !!taskId,
  });
}
