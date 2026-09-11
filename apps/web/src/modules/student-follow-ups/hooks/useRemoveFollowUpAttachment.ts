import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useRemoveFollowUpAttachment() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { followUpId: string; attachmentId: string }>({
    mutationFn: ({ followUpId, attachmentId }) =>
      apiClient.delete(`/student-follow-ups/${followUpId}/attachments/${attachmentId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['student-follow-up-attachments', variables.followUpId],
      });
    },
  });
}
