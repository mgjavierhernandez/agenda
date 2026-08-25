import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { GuardianStudent } from '@/api/types';

export function useUnlinkGuardian() {
  const queryClient = useQueryClient();

  return useMutation<GuardianStudent, Error, string>({
    mutationFn: (studentId) => apiClient.delete(`/guardians/students/${studentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-students'] });
    },
  });
}
