import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { StudentFollowUpCategory, UpdateFollowUpCategoryInput } from '@/api/types';

export function useUpdateFollowUpCategory() {
  const queryClient = useQueryClient();
  return useMutation<StudentFollowUpCategory, Error, { id: string; data: UpdateFollowUpCategoryInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/student-follow-ups/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-follow-up-categories'] });
    },
  });
}
