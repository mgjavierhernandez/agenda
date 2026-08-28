import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { FollowUpAttachment } from '@/api/types';

export function useFollowUpAttachments(followUpId: string) {
  return useQuery<FollowUpAttachment[]>({
    queryKey: ['student-follow-up-attachments', followUpId],
    queryFn: () => apiClient.get(`/student-follow-ups/${followUpId}/attachments`),
    enabled: !!followUpId,
  });
}
