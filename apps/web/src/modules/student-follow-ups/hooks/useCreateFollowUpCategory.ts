import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { StudentFollowUpCategory, CreateFollowUpCategoryInput } from '@/api/types';

export function useCreateFollowUpCategory() {
  const queryClient = useQueryClient();
  return useMutation<StudentFollowUpCategory, Error, CreateFollowUpCategoryInput>({
    mutationFn: (data) => apiClient.post('/student-follow-ups/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-follow-up-categories'] });
    },
  });
}
