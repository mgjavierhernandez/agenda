import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { AssignRoleInput } from '@/api/types';

export function useAssignRole(institutionId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { userId: string; roleId: string }>({
    mutationFn: ({ userId, roleId }) => {
      const body: AssignRoleInput = { roleId };
      return apiClient.post<unknown>(
        `/institutions/${institutionId}/memberships/user/${userId}/roles`,
        body,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships', institutionId] });
    },
  });
}
