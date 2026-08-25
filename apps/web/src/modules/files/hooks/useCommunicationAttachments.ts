import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CommunicationAttachment } from '@/api/types';

export function useCommunicationAttachments(communicationId: string) {
  return useQuery<CommunicationAttachment[]>({
    queryKey: ['communication-attachments', communicationId],
    queryFn: () => apiClient.get<CommunicationAttachment[]>(`/communications/${communicationId}/attachments`),
    enabled: !!communicationId,
  });
}
