import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { FollowUpCitation, CreateFollowUpCitationInput } from '@/api/types';

export function useCreateFollowUpCitation() {
  const queryClient = useQueryClient();
  return useMutation<
    FollowUpCitation,
    Error,
    { followUpId: string; data: CreateFollowUpCitationInput }
  >({
    mutationFn: ({ followUpId, data }) =>
      apiClient.post(`/student-follow-ups/${followUpId}/citations`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['student-follow-up-citations', variables.followUpId],
      });
      queryClient.invalidateQueries({
        queryKey: ['student-follow-ups', variables.followUpId],
      });
    },
  });
}
