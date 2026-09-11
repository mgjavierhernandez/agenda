import { useDeleteFile } from '../hooks/useDeleteFile';
import { useDownloadFile } from '../hooks/useDownloadFile';
import { formatFileSize } from '../utils';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { FileAsset, TaskAttachment, CommunicationAttachment } from '@/api/types';

type Attachment = TaskAttachment | CommunicationAttachment;

interface AttachmentListProps {
  attachments: Attachment[];
  canManage: boolean;
  onDelete?: () => void;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
  if (mimeType === 'text/plain') return '📃';
  return '📎';
}

export function AttachmentList({ attachments, canManage, onDelete }: AttachmentListProps) {
  const deleteFileMutation = useDeleteFile();
  const downloadMutation = useDownloadFile();

  const handleDownload = (fileAsset: FileAsset) => {
    downloadMutation.mutate({ fileId: fileAsset.id, fileName: fileAsset.originalName });
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm('¿Estás seguro de eliminar este archivo?')) return;
    try {
      await deleteFileMutation.mutateAsync(attachment.fileAssetId);
      onDelete?.();
    } catch {
      // Error handled by mutation
    }
  };

  if (attachments.length === 0) {
    return <p className="text-sm text-gray-500">No hay archivos adjuntos.</p>;
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl flex-shrink-0">
              {getFileIcon(attachment.fileAsset.mimeType)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {attachment.fileAsset.originalName}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(attachment.fileAsset.sizeBytes)}
                {' · '}
                {attachment.fileAsset.mimeType}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(attachment.fileAsset)}
              disabled={downloadMutation.isPending}
            >
              {downloadMutation.isPending ? <Spinner size="sm" /> : 'Descargar'}
            </Button>
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(attachment)}
                disabled={deleteFileMutation.isPending}
              >
                Eliminar
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
