import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UserMembership } from '@/api/types';

function useMembershipDecision(action: 'approve' | 'reject') {
  const queryClient = useQueryClient();

  return useMutation<
    UserMembership,
    Error,
    { institutionId: string | null | undefined; membershipId: string }
  >({
    mutationFn: ({ institutionId, membershipId }) =>
      apiClient.post<UserMembership>(
        `/institutions/${institutionId}/memberships/${membershipId}/${action}`,
        {},
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
    },
  });
}

export function useApproveMembership() {
  return useMembershipDecision('approve');
}

export function useRejectMembership() {
  return useMembershipDecision('reject');
}
