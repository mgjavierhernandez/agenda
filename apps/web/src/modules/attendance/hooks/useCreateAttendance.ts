import { useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Attendance, CreateAttendanceInput } from '@/api/types';

export function useCreateAttendance() {
  const queryClient = useQueryClient();
  return useMutation<Attendance, Error, CreateAttendanceInput>({
    mutationFn: (data) => apiClient.post('/attendance', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });
}
