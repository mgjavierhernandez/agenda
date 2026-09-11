import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { FollowUpEntry, UpdateFollowUpEntryInput } from '@/api/types';

export function useUpdateFollowUpEntry() {
  const queryClient = useQueryClient();
  return useMutation<
    FollowUpEntry,
    Error,
    { followUpId: string; entryId: string; data: UpdateFollowUpEntryInput }
  >({
    mutationFn: ({ followUpId, entryId, data }) =>
      apiClient.patch(`/student-follow-ups/${followUpId}/entries/${entryId}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['student-follow-up-entries', variables.followUpId],
      });
    },
  });
}
