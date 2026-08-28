import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function useDeleteFollowUpCategory() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (id) => apiClient.delete(`/student-follow-ups/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-follow-up-categories'] });
    },
  });
}
