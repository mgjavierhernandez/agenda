import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { GuardianStudent, LinkGuardianInput } from '@/api/types';

export function useLinkGuardian() {
  const queryClient = useQueryClient();

  return useMutation<GuardianStudent, Error, { studentId: string; data: LinkGuardianInput }>({
    mutationFn: ({ studentId, data }) => apiClient.post(`/guardians/students/${studentId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-students'] });
    },
  });
}
