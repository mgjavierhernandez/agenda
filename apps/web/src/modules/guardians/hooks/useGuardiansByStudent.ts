import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { GuardianStudent } from '@/api/types';

export function useGuardiansByStudent(studentId: string) {
  return useQuery<GuardianStudent[]>({
    queryKey: ['guardian-students', 'by-student', studentId],
    queryFn: () => apiClient.get(`/guardians/students/${studentId}/guardians`),
    enabled: !!studentId,
  });
}
