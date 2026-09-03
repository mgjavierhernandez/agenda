import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Institution, InstitutionUpdateInput } from '@/api/types';

export function useUpdateInstitution(institutionId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<Institution, Error, InstitutionUpdateInput>({
    mutationFn: (input) => apiClient.patch<Institution>(`/institutions/${institutionId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution', institutionId] });
    },
  });
}
