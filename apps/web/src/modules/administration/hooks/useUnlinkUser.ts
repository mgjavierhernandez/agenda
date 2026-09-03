import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useUnlinkUser(institutionId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, string>({
    mutationFn: (userId) =>
      apiClient.delete<unknown>(`/institutions/${institutionId}/memberships/user/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships', institutionId] });
    },
  });
}
