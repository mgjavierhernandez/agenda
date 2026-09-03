import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreateMembershipInput } from '@/api/types';

export interface LinkUserResult {
  id: string;
  userId: string;
  institutionId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export function useLinkUser(institutionId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<LinkUserResult, Error, CreateMembershipInput>({
    mutationFn: (input) =>
      apiClient.post<LinkUserResult>(`/institutions/${institutionId}/memberships`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships', institutionId] });
    },
  });
}
