import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  useSignature,
  useSignSignature,
  useDeclineSignature,
  usePublishSignature,
  useDeactivateSignature,
} from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { useAuth } from '@/auth/auth.store';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { SIGNATURE_REQUEST_STATUS_LABELS, SIGNATURE_RECIPIENT_STATUS_LABELS } from '@/api/types';
import type { SignatureRequestStatus, SignatureRecipientStatus } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<
  SignatureRequestStatus,
  'success' | 'warning' | 'default' | 'danger' | 'info'
> = {
  DRAFT: 'default',
  PUBLISHED: 'info',
  COMPLETED: 'success',
  EXPIRED: 'danger',
  INACTIVE: 'warning',
};

const RECIPIENT_STATUS_BADGE_VARIANT: Record<
  SignatureRecipientStatus,
  'success' | 'default' | 'danger'
> = {
  PENDING: 'default',
  SIGNED: 'success',
  DECLINED: 'danger',
};

export function SignatureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const canRequest = hasPermission(PERMISSIONS.SIGNATURES_REQUEST);
  const canSign = hasPermission(PERMISSIONS.SIGNATURES_SIGN);

  const { data: signature, isLoading, error } = useSignature(id ?? '');
  const signMutation = useSignSignature();
  const declineMutation = useDeclineSignature();
  const publishMutation = usePublishSignature();
  const deactivateMutation = useDeactivateSignature();

  const [confirmAction, setConfirmAction] = useState<
    'sign' | 'decline' | 'publish' | 'deactivate' | null
  >(null);

  const handleConfirmAction = async () => {
    if (!id || !confirmAction) return;
    try {
      if (confirmAction === 'sign') {
        await signMutation.mutateAsync(id);
      } else if (confirmAction === 'decline') {
        await declineMutation.mutateAsync(id);
      } else if (confirmAction === 'publish') {
        await publishMutation.mutateAsync(id);
      } else if (confirmAction === 'deactivate') {
        await deactivateMutation.mutateAsync(id);
        navigate('/signatures');
        return;
      }
      setConfirmAction(null);
    } catch {
      setConfirmAction(null);
    }
  };

  const isTransitionPending =
    signMutation.isPending ||
    declineMutation.isPending ||
    publishMutation.isPending ||
    deactivateMutation.isPending;

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

  if (!signature) {
    return (
      <ErrorState
        error={{ statusCode: 404, message: 'Solicitud no encontrada', timestamp: '', path: '' }}
      />
    );
  }

  const isCurrentUserRecipient = signature.recipients?.some((r) => r.userId === user?.id);
  const currentRecipient = signature.recipients?.find((r) => r.userId === user?.id);
  const canEdit = canRequest && signature.status === 'DRAFT';
  const canPublish = canRequest && signature.status === 'DRAFT';
  const canDeactivate = canRequest && signature.status !== 'INACTIVE';
  const canSignNow =
    canSign &&
    isCurrentUserRecipient &&
    signature.status === 'PUBLISHED' &&
    currentRecipient?.status === 'PENDING';
  const canDeclineNow =
    canSign &&
    isCurrentUserRecipient &&
    signature.status === 'PUBLISHED' &&
    currentRecipient?.status === 'PENDING';
  const isExpired = signature.status === 'EXPIRED';

  const confirmMessages: Record<string, { title: string; body: string }> = {
    sign: {
      title: 'Confirmar firma',
      body: `¿Deseas firmar la solicitud "${signature.title}"? Esta acción registrará tu firma.`,
    },
    decline: {
      title: 'Confirmar rechazo',
      body: `¿Deseas rechazar la solicitud "${signature.title}"? Tu estado cambiará a "Rechazada".`,
    },
    publish: {
      title: 'Confirmar publicación',
      body: `¿Deseas publicar la solicitud "${signature.title}"? Los firmantes podrán firmar o rechazar.`,
    },
    deactivate: {
      title: 'Confirmar desactivación',
      body: `¿Deseas desactivar la solicitud "${signature.title}"? Esta acción no se puede revertir.`,
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={signature.title}
        description={signature.description ?? 'Sin descripción'}
        actions={
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="secondary" onClick={() => navigate(`/signatures/${id}/edit`)}>
                Editar
              </Button>
            )}
            {canPublish && <Button onClick={() => setConfirmAction('publish')}>Publicar</Button>}
            {canSignNow && <Button onClick={() => setConfirmAction('sign')}>Firmar</Button>}
            {canDeclineNow && (
              <Button variant="secondary" onClick={() => setConfirmAction('decline')}>
                Rechazar
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Solicitud</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Título</dt>
              <dd className="text-gray-900">{signature.title}</dd>
            </div>
            {signature.description && (
              <div>
                <dt className="text-sm text-gray-500">Descripción</dt>
                <dd className="text-gray-900 whitespace-pre-wrap">{signature.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={STATUS_BADGE_VARIANT[signature.status]}>
                  {SIGNATURE_REQUEST_STATUS_LABELS[signature.status]}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Fecha límite</dt>
              <dd className="text-gray-900">
                {signature.dueDate ? new Date(signature.dueDate).toLocaleString('es-CO') : '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadatos</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">ID</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{signature.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Institución</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">
                {signature.institutionId}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Creado</dt>
              <dd className="text-gray-900">
                {new Date(signature.createdAt).toLocaleString('es-CO')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Última actualización</dt>
              <dd className="text-gray-900">
                {new Date(signature.updatedAt).toLocaleString('es-CO')}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Firmantes ({signature.recipients?.length ?? 0})
        </h3>
        {!signature.recipients || signature.recipients.length === 0 ? (
          <p className="text-sm text-gray-500">No hay firmantes asignados.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {signature.recipients.map((recipient) => (
              <div key={recipient.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {recipient.user?.firstName?.[0] ?? recipient.userId[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {recipient.user
                        ? `${recipient.user.firstName} ${recipient.user.lastName}`
                        : recipient.userId.slice(0, 8) + '…'}
                    </p>
                    {recipient.user && (
                      <p className="text-xs text-gray-500">{recipient.user.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {recipient.signedAt && (
                    <span className="text-xs text-gray-500">
                      {new Date(recipient.signedAt).toLocaleString('es-CO')}
                    </span>
                  )}
                  <Badge variant={RECIPIENT_STATUS_BADGE_VARIANT[recipient.status]}>
                    {SIGNATURE_RECIPIENT_STATUS_LABELS[recipient.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {isExpired && (
        <Card>
          <div className="flex items-center gap-3 text-red-700">
            <span className="text-lg">⚠️</span>
            <p className="text-sm font-medium">
              Esta solicitud expiró porque pasó la fecha límite.
            </p>
          </div>
        </Card>
      )}

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/signatures')}>
          Volver a firmas
        </Button>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmMessages[confirmAction].title}
            </h3>
            <p className="text-gray-600 mb-6">{confirmMessages[confirmAction].body}</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmAction(null)}>
                Cancelar
              </Button>
              <Button
                variant={
                  confirmAction === 'deactivate' || confirmAction === 'decline'
                    ? 'danger'
                    : 'primary'
                }
                isLoading={isTransitionPending}
                onClick={handleConfirmAction}
              >
                {confirmAction === 'sign' && 'Firmar'}
                {confirmAction === 'decline' && 'Rechazar'}
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
