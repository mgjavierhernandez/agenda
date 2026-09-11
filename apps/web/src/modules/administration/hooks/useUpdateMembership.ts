import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UpdateMembershipInput } from '@/api/types';

export function useUpdateMembership(institutionId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { membershipId: string; data: UpdateMembershipInput }>({
    mutationFn: ({ membershipId, data }) =>
      apiClient.patch<unknown>(`/institutions/${institutionId}/memberships/${membershipId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships', institutionId] });
    },
  });
}
