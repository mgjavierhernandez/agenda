import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Commitment, CreateCommitmentInput } from '@/api/types';

export function useCreateCommitment() {
  const queryClient = useQueryClient();
  return useMutation<Commitment, Error, { followUpId: string; data: CreateCommitmentInput }>({
    mutationFn: ({ followUpId, data }) =>
      apiClient.post(`/student-follow-ups/${followUpId}/commitments`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['student-follow-up-commitments', variables.followUpId],
      });
      queryClient.invalidateQueries({ queryKey: ['student-follow-ups', variables.followUpId] });
    },
  });
}
