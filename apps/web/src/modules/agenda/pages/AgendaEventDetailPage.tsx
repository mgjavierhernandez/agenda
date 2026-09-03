import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAgendaEvent, useCancelAgendaEvent } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { COMMUNICATION_AUDIENCE_LABELS } from '@/api/types';
import type { AgendaEventStatus } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<AgendaEventStatus, 'success' | 'default' | 'danger'> = {
  ACTIVE: 'success',
  CANCELLED: 'danger',
};

const STATUS_LABELS: Record<AgendaEventStatus, string> = {
  ACTIVE: 'Activo',
  CANCELLED: 'Cancelado',
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'Ocurrió un error inesperado.';
}

export function AgendaEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(PERMISSIONS.AGENDA_UPDATE);
  const canCancel = hasPermission(PERMISSIONS.AGENDA_DELETE);

  const { data: event, isLoading, error } = useAgendaEvent(id ?? '');
  const cancelMutation = useCancelAgendaEvent();

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [apiError, setApiError] = useState('');

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

  if (!event) {
    return <ErrorState error={{ statusCode: 404, message: 'Evento no encontrado', timestamp: '', path: '' }} />;
  }

  const isCancelled = event.status === 'CANCELLED';

  const handleCancel = async () => {
    if (!id) return;
    setApiError('');
    try {
      await cancelMutation.mutateAsync(id);
      setConfirmCancel(false);
      navigate('/agenda');
    } catch (err) {
      setApiError(getErrorMessage(err));
      setConfirmCancel(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.title}
        description={event.location ?? 'Sin ubicación'}
        actions={
          <div className="flex gap-2">
            {canEdit && !isCancelled && (
              <Button variant="secondary" onClick={() => navigate(`/agenda/events/${id}/edit`)}>
                Editar
              </Button>
            )}
            {canCancel && !isCancelled && (
              <Button variant="danger" onClick={() => setConfirmCancel(true)}>
                Cancelar evento
              </Button>
            )}
          </div>
        }
      />

      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del evento</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Título</dt>
              <dd className="text-gray-900">{event.title}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Descripción</dt>
              <dd className="text-gray-900">{event.description ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Ubicación</dt>
              <dd className="text-gray-900">{event.location ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Audiencia</dt>
              <dd className="text-gray-900">{COMMUNICATION_AUDIENCE_LABELS[event.audience]}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={STATUS_BADGE_VARIANT[event.status]}>
                  {STATUS_LABELS[event.status]}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fechas y Metadatos</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Inicio</dt>
              <dd className="text-gray-900">
                {new Date(event.startAt).toLocaleString('es-CO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Fin</dt>
              <dd className="text-gray-900">
                {new Date(event.endAt).toLocaleString('es-CO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Creado por</dt>
              <dd className="text-gray-900">
                {event.createdBy.firstName} {event.createdBy.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">ID</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{event.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Creado</dt>
              <dd className="text-gray-900">
                {new Date(event.createdAt).toLocaleString('es-CO')}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/agenda')}>
          Volver a la agenda
        </Button>
      </div>

      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirmar cancelación
            </h3>
            <p className="text-gray-600 mb-6">
              ¿Deseas cancelar el evento "{event.title}"? Este cambiará su estado a Cancelado y
              dejará de mostrarse en la agenda.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
                Volver
              </Button>
              <Button
                variant="danger"
                isLoading={cancelMutation.isPending}
                onClick={handleCancel}
              >
                Cancelar evento
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}