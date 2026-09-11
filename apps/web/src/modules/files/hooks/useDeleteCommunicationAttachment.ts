import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useDeleteCommunicationAttachment() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean },
    Error,
    { communicationId: string; attachmentId: string }
  >({
    mutationFn: ({ communicationId, attachmentId }) =>
      apiClient.delete<{ success: boolean }>(
        `/communications/${communicationId}/attachments/${attachmentId}`,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['communication-attachments', variables.communicationId],
      });
    },
  });
}
