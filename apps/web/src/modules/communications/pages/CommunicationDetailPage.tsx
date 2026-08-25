import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useCommunication, usePublishCommunication, useDeactivateCommunication } from '../hooks';
import { useCommunicationAttachments, useCreateCommunicationAttachment } from '@/modules/files/hooks';
import { FileUploader } from '@/modules/files/components/FileUploader';
import { AttachmentList } from '@/modules/files/components/AttachmentList';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import type { CommunicationStatus, FileAsset } from '@/api/types';
import { COMMUNICATION_STATUS_LABELS, COMMUNICATION_AUDIENCE_LABELS } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<CommunicationStatus, 'success' | 'warning' | 'default' | 'danger'> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  INACTIVE: 'danger',
};

export function CommunicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.COMMUNICATIONS_MANAGE);

  const { data: communication, isLoading, error } = useCommunication(id ?? '');
  const publishMutation = usePublishCommunication();
  const deactivateMutation = useDeactivateCommunication();
  const { data: attachments = [], refetch: refetchAttachments } = useCommunicationAttachments(id ?? '');
  const createAttachmentMutation = useCreateCommunicationAttachment();
  const canAttach = canManage && communication?.status === 'DRAFT';

  const handleUploadComplete = async (fileAsset: FileAsset) => {
    if (!id) return;
    await createAttachmentMutation.mutateAsync({ communicationId: id, fileAssetId: fileAsset.id });
  };

  const [confirmAction, setConfirmAction] = useState<'publish' | 'deactivate' | null>(null);

  const handleConfirmAction = async () => {
    if (!id || !confirmAction) return;
    try {
      if (confirmAction === 'publish') {
        await publishMutation.mutateAsync(id);
      } else if (confirmAction === 'deactivate') {
        await deactivateMutation.mutateAsync(id);
        navigate('/communications');
        return;
      }
      setConfirmAction(null);
    } catch {
      setConfirmAction(null);
    }
  };

  const isTransitionPending = publishMutation.isPending || deactivateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  if (!communication) {
    return <ErrorState error={{ statusCode: 404, message: 'Comunicación no encontrada', timestamp: '', path: '' }} />;
  }

  const canEdit = canManage && communication.status === 'DRAFT';
  const canPublish = canManage && communication.status === 'DRAFT';
  const canDeactivate = canManage && communication.status !== 'INACTIVE';

  return (
    <div className="space-y-6">
      <PageHeader
        title={communication.title}
        description={COMMUNICATION_AUDIENCE_LABELS[communication.audience]}
        actions={
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="secondary" onClick={() => navigate(`/communications/${id}/edit`)}>
                Editar
              </Button>
            )}
            {canPublish && (
              <Button onClick={() => setConfirmAction('publish')}>
                Publicar
              </Button>
            )}
            {canDeactivate && (
              <Button variant="danger" onClick={() => setConfirmAction('deactivate')}>
                Desactivar
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Comunicación</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Título</dt>
              <dd className="text-gray-900">{communication.title}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Contenido</dt>
              <dd className="text-gray-900 whitespace-pre-wrap">{communication.content}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Audiencia</dt>
              <dd className="text-gray-900">{COMMUNICATION_AUDIENCE_LABELS[communication.audience]}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={STATUS_BADGE_VARIANT[communication.status]}>
                  {COMMUNICATION_STATUS_LABELS[communication.status]}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadatos</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">ID</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{communication.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Institución</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{communication.institutionId}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Publicado</dt>
              <dd className="text-gray-900">
                {communication.publishedAt
                  ? new Date(communication.publishedAt).toLocaleString('es-CO')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Expira</dt>
              <dd className="text-gray-900">
                {communication.expiresAt
                  ? new Date(communication.expiresAt).toLocaleString('es-CO')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Creado</dt>
              <dd className="text-gray-900">
                {new Date(communication.createdAt).toLocaleString('es-CO')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Última actualización</dt>
              <dd className="text-gray-900">
                {new Date(communication.updatedAt).toLocaleString('es-CO')}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Archivos adjuntos</h3>
          {canAttach && (
            <span className="text-sm text-gray-500">Máx. 10 archivos, 10 MB c/u</span>
          )}
        </div>
        <AttachmentList
          attachments={attachments}
          canManage={canManage}
          onDelete={() => refetchAttachments()}
        />
        {canAttach && (
          <div className="mt-4">
            <FileUploader
              onUploadComplete={handleUploadComplete}
              disabled={createAttachmentMutation.isPending}
            />
            {createAttachmentMutation.isPending && (
              <p className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                <Spinner size="sm" /> Adjuntando archivo...
              </p>
            )}
          </div>
        )}
      </Card>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/communications')}>
          Volver a comunicaciones
        </Button>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmAction === 'publish' && 'Confirmar publicación'}
              {confirmAction === 'deactivate' && 'Confirmar desactivación'}
            </h3>
            <p className="text-gray-600 mb-6">
              {confirmAction === 'publish' && `¿Deseas publicar la comunicación "${communication.title}"? Los destinatarios podrán recibirla según la audiencia seleccionada.`}
              {confirmAction === 'deactivate' && `¿Deseas desactivar la comunicación "${communication.title}"? Esta acción no se puede revertir.`}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmAction(null)}>
                Cancelar
              </Button>
              <Button
                variant={confirmAction === 'deactivate' ? 'danger' : 'primary'}
                isLoading={isTransitionPending}
                onClick={handleConfirmAction}
              >
                {confirmAction === 'publish' && 'Publicar'}
                {confirmAction === 'deactivate' && 'Desactivar'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
