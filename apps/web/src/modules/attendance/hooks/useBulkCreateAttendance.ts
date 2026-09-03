import { useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreateAttendanceBulkInput, CreateAttendanceBulkResult } from '@/api/types';

export function useBulkCreateAttendance() {
  const queryClient = useQueryClient();
  return useMutation<CreateAttendanceBulkResult, Error, CreateAttendanceBulkInput>({
    mutationFn: (data) => apiClient.post('/attendance/bulk', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });
}
