import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  FollowUpCitation,
  UpdateFollowUpCitationInput,
} from '@/api/types';

export function useUpdateFollowUpCitation() {
  const queryClient = useQueryClient();
  return useMutation<
    FollowUpCitation,
    Error,
    { followUpId: string; citationId: string; data: UpdateFollowUpCitationInput }
  >({
    mutationFn: ({ followUpId, citationId, data }) =>
      apiClient.patch(
        `/student-follow-ups/${followUpId}/citations/${citationId}`,
        data,
      ),
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
