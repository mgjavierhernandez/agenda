import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { SelfRegisterInput } from '@/api/types';

export interface SelfRegisterResult {
  message: string;
  status: 'PENDING';
}

export function useSelfRegister() {
  return useMutation<SelfRegisterResult, Error, SelfRegisterInput>({
    mutationFn: (input) => apiClient.post<SelfRegisterResult>('/auth/self-register', input),
  });
}
