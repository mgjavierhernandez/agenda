import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAcademicPeriod, useDeactivateAcademicPeriod, useCloseAcademicPeriod } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import type { AcademicPeriodStatus } from '@/api/types';
import { ACADEMIC_PERIOD_STATUS_LABELS } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<AcademicPeriodStatus, 'success' | 'default' | 'danger'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  CLOSED: 'danger',
};

export function AcademicPeriodDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.ACADEMIC_PERIODS_MANAGE);
  const canClose = hasPermission(PERMISSIONS.ACADEMIC_PERIODS_CLOSE);

  const { data: period, isLoading, error } = useAcademicPeriod(id ?? '');
  const deactivateMutation = useDeactivateAcademicPeriod();
  const closeMutation = useCloseAcademicPeriod();

  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const handleDeactivate = async () => {
    if (!id) return;
    try {
      await deactivateMutation.mutateAsync(id);
      setConfirmDeactivate(false);
    } catch {
      setConfirmDeactivate(false);
    }
  };

  const handleClose = async () => {
    if (!id) return;
    try {
      await closeMutation.mutateAsync(id);
      setConfirmClose(false);
    } catch {
      setConfirmClose(false);
    }
  };

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

  if (!period) {
    return (
      <ErrorState
        error={{ statusCode: 404, message: 'Periodo no encontrado', timestamp: '', path: '' }}
      />
    );
  }

  const isClosed = period.status === 'CLOSED';
  const canEdit = canManage && !isClosed;
  const canDeactivate = canManage && period.status === 'ACTIVE';
  const canCloseNow = canClose && period.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      <PageHeader
        title={period.name}
        description={`Código: ${period.code}`}
        actions={
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="secondary" onClick={() => navigate(`/academic-periods/${id}/edit`)}>
                Editar
              </Button>
            )}
            {canDeactivate && (
              <Button variant="danger" onClick={() => setConfirmDeactivate(true)}>
                Desactivar
              </Button>
            )}
            {canCloseNow && (
              <Button variant="danger" onClick={() => setConfirmClose(true)}>
                Cerrar periodo
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Periodo</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Nombre</dt>
              <dd className="text-gray-900">{period.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Código</dt>
              <dd className="text-gray-900 font-mono">{period.code}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={STATUS_BADGE_VARIANT[period.status]}>
                  {ACADEMIC_PERIOD_STATUS_LABELS[period.status]}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fechas y Metadatos</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Fecha de inicio</dt>
              <dd className="text-gray-900">
                {new Date(period.startDate).toLocaleDateString('es-CO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Fecha de finalización</dt>
              <dd className="text-gray-900">
                {new Date(period.endDate).toLocaleDateString('es-CO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">ID</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{period.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Creado</dt>
              <dd className="text-gray-900">
                {new Date(period.createdAt).toLocaleString('es-CO')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Última actualización</dt>
              <dd className="text-gray-900">
                {new Date(period.updatedAt).toLocaleString('es-CO')}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/academic-periods')}>
          Volver a periodos
        </Button>
      </div>

      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar desactivación</h3>
            <p className="text-gray-600 mb-6">
              ¿Deseas desactivar el periodo "{period.name}"? Esta acción cambiará su estado a
              Inactivo.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmDeactivate(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                isLoading={deactivateMutation.isPending}
                onClick={handleDeactivate}
              >
                Desactivar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {confirmClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirmar cierre del periodo
            </h3>
            <p className="text-gray-600 mb-6">
              Al cerrar el periodo "{period.name}" no se podrá modificar, eliminar ni crear
              calificaciones asociadas a este periodo. Esta acción es irreversible.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmClose(false)}>
                Cancelar
              </Button>
              <Button variant="danger" isLoading={closeMutation.isPending} onClick={handleClose}>
                Cerrar periodo
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
