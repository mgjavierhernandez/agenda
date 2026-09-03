import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UserMembership } from '@/api/types';

export function useMembership(
  institutionId: string | null | undefined,
  membershipId: string | undefined,
) {
  return useQuery<UserMembership>({
    queryKey: ['membership', institutionId, membershipId],
    queryFn: () =>
      apiClient.get<UserMembership>(`/institutions/${institutionId}/memberships/${membershipId}`),
    enabled: !!institutionId && !!membershipId,
  });
}
