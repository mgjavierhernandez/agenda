import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface SubmissionAttachmentView {
  id: string;
  submissionId: string;
  fileAssetId: string;
  createdAt: string;
  fileAsset: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  };
}

export function useSubmissionAttachments(assignmentId: string) {
  return useQuery<SubmissionAttachmentView[]>({
    queryKey: ['submission-attachments', assignmentId],
    queryFn: () => apiClient.get(`/task-assignments/${assignmentId}/submission/attachments`),
    enabled: !!assignmentId,
  });
}

export function useRemoveSubmissionAttachment() {
  const queryClient = useQueryClient();

  return useMutation<{ deleted: boolean }, Error, { assignmentId: string; attachmentId: string }>({
    mutationFn: ({ assignmentId, attachmentId }) =>
      apiClient.delete(`/task-assignments/${assignmentId}/submission/attachments/${attachmentId}`),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['submission-attachments', vars.assignmentId] });
    },
  });
}
