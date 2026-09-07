import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useSchedule, useDeactivateSchedule } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { DAY_OF_WEEK_LABELS } from '@/api/types';

export function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SCHEDULES_MANAGE);

  const { data: schedule, isLoading, error } = useSchedule(id ?? '');
  const deactivateMutation = useDeactivateSchedule();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeactivate = async () => {
    if (!id) return;
    await deactivateMutation.mutateAsync(id);
    setShowConfirm(false);
    navigate('/schedules');
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

  if (!schedule) {
    return <ErrorState error={{ statusCode: 404, message: 'Horario no encontrado', timestamp: '', path: '' }} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${DAY_OF_WEEK_LABELS[schedule.dayOfWeek]} — ${schedule.startTime} a ${schedule.endTime}`}
        description={schedule.classroomId ? `Aula ${schedule.classroomId.slice(0, 8)}…` : 'Sin aula asignada'}
        actions={
          <div className="flex gap-2">
            {canManage && (
              <Button variant="secondary" onClick={() => navigate(`/schedules/${id}/edit`)}>
                Editar
              </Button>
            )}
            {canManage && schedule.status === 'ACTIVE' && (
              <Button variant="danger" onClick={() => setShowConfirm(true)}>
                Desactivar
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Horario</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Día</dt>
              <dd className="text-gray-900">{DAY_OF_WEEK_LABELS[schedule.dayOfWeek]}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Hora de inicio</dt>
              <dd className="text-gray-900 font-mono">{schedule.startTime}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Hora de fin</dt>
              <dd className="text-gray-900 font-mono">{schedule.endTime}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Aula</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">
                {schedule.classroomId ?? 'Sin aula asignada'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Bloque de horario</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">
                {schedule.blockId ?? 'Sin bloque asignado'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={schedule.status === 'ACTIVE' ? 'success' : 'default'}>
                  {schedule.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Relaciones y Metadatos</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Curso</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{schedule.courseId}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Asignatura</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{schedule.subjectId}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Periodo académico</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">
                {schedule.academicPeriodId ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Profesor asignado</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">
                {schedule.teacherUserId ?? 'Sin profesor'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">ID</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{schedule.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Creado</dt>
              <dd className="text-gray-900">
                {new Date(schedule.createdAt).toLocaleString('es-CO')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Última actualización</dt>
              <dd className="text-gray-900">
                {new Date(schedule.updatedAt).toLocaleString('es-CO')}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/schedules')}>
          Volver a horarios
        </Button>
      </div>

      {/* Deactivate confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar desactivación</h3>
            <p className="text-gray-600 mb-6">
              ¿Deseas desactivar el horario de {DAY_OF_WEEK_LABELS[schedule.dayOfWeek]} ({schedule.startTime} — {schedule.endTime})? Esta acción puede revertirse editando el horario.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>
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
    </div>
  );
}
