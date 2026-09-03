import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { SignatureRequest } from '@/api/types';

export function useFollowUpSignatures(followUpId: string) {
  return useQuery<SignatureRequest[]>({
    queryKey: ['student-follow-up-signatures', followUpId],
    queryFn: () =>
      apiClient.get<SignatureRequest[]>(
        `/student-follow-ups/${followUpId}/signatures`,
      ),
    enabled: !!followUpId,
  });
}
