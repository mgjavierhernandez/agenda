import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useRemoveRole(institutionId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { userId: string; roleId: string }>({
    mutationFn: ({ userId, roleId }) =>
      apiClient.delete<unknown>(
        `/institutions/${institutionId}/memberships/user/${userId}/roles/${roleId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships', institutionId] });
    },
  });
}
