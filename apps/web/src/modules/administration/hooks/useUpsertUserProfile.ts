import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UserProfile, UpsertUserProfileInput } from '@/api/types';

export function useUpsertUserProfile(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<UserProfile, Error, UpsertUserProfileInput>({
    mutationFn: (input) => apiClient.patch<UserProfile>(`/users/${userId}/profile`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
}
