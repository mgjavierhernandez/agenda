import { useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Attendance, UpdateAttendanceInput } from '@/api/types';

export function useUpdateAttendance() {
  const queryClient = useQueryClient();
  return useMutation<Attendance, Error, { id: string; data: UpdateAttendanceInput }>({
    mutationFn: ({ id, data }) => apiClient.patch(`/attendance/${id}`, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      queryClient.invalidateQueries({ queryKey: ['attendances', variables.id] });
    },
  });
}
