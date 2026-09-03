import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { SignatureRequest } from '@/api/types';

export interface RequestSignatureFromFollowUpInput {
  followUpId: string;
  followUpEntryId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  recipientUserIds: string[];
}

export function useRequestSignatureFromFollowUp() {
  const queryClient = useQueryClient();
  return useMutation<SignatureRequest, Error, RequestSignatureFromFollowUpInput>({
    mutationFn: (data) => {
      const { followUpId, ...rest } = data;
      return apiClient.post<SignatureRequest>(
        `/student-follow-ups/${followUpId}/signatures`,
        rest,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      queryClient.invalidateQueries({
        queryKey: ['student-follow-ups', variables.followUpId],
      });
      queryClient.invalidateQueries({ queryKey: ['student-follow-up-entries', variables.followUpId] });
    },
  });
}
