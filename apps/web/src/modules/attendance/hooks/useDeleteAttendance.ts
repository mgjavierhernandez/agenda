import { useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface DeleteResult {
  success: boolean;
}

export function useDeleteAttendance() {
  const queryClient = useQueryClient();
  return useMutation<DeleteResult, Error, string>({
    mutationFn: (id) => apiClient.delete(`/attendance/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });
}
