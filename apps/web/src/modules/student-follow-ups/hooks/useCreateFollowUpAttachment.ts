import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { FollowUpAttachment, CreateFollowUpAttachmentInput } from '@/api/types';

export function useCreateFollowUpAttachment() {
  const queryClient = useQueryClient();
  return useMutation<
    FollowUpAttachment,
    Error,
    { followUpId: string; data: CreateFollowUpAttachmentInput }
  >({
    mutationFn: ({ followUpId, data }) =>
      apiClient.post(`/student-follow-ups/${followUpId}/attachments`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['student-follow-up-attachments', variables.followUpId],
      });
    },
  });
}
