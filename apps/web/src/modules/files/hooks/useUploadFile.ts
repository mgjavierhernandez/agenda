import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { FileAsset } from '@/api/types';

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation<FileAsset, Error, File>({
    mutationFn: (file: File) => apiClient.upload<FileAsset>('/files', file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments'] });
      queryClient.invalidateQueries({ queryKey: ['communication-attachments'] });
    },
  });
}
