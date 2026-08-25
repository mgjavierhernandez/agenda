import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CommunicationAttachment } from '@/api/types';

export function useCreateCommunicationAttachment() {
  const queryClient = useQueryClient();

  return useMutation<CommunicationAttachment, Error, { communicationId: string; fileAssetId: string }>({
    mutationFn: ({ communicationId, fileAssetId }) =>
      apiClient.post<CommunicationAttachment>(`/communications/${communicationId}/attachments`, { fileAssetId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communication-attachments', variables.communicationId] });
    },
  });
}
