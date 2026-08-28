import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { FollowUpEntry, CreateFollowUpEntryInput } from '@/api/types';

export function useCreateFollowUpEntry() {
  const queryClient = useQueryClient();
  return useMutation<FollowUpEntry, Error, { followUpId: string; data: CreateFollowUpEntryInput }>({
    mutationFn: ({ followUpId, data }) => apiClient.post(`/student-follow-ups/${followUpId}/entries`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-follow-up-entries', variables.followUpId] });
      queryClient.invalidateQueries({ queryKey: ['student-follow-ups', variables.followUpId] });
    },
  });
}
