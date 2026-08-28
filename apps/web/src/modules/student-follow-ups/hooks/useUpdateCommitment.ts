import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Commitment, UpdateCommitmentInput } from '@/api/types';

export function useUpdateCommitment() {
  const queryClient = useQueryClient();
  return useMutation<Commitment, Error, { followUpId: string; commitmentId: string; data: UpdateCommitmentInput }>({
    mutationFn: ({ followUpId, commitmentId, data }) => apiClient.patch(`/student-follow-ups/${followUpId}/commitments/${commitmentId}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-follow-up-commitments', variables.followUpId] });
    },
  });
}
