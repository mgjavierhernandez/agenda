import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  useTaskAssignment,
  useUpdateTaskAssignment,
  useDeactivateTaskAssignment,
  useMarkTaskAssignmentOpened,
} from '../hooks';
import { useTaskSubmission, useSubmissionAttachments } from '@/modules/task-submissions/hooks';
import { useTask } from '@/modules/tasks/hooks';
import { useStudents } from '@/modules/students/hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { TASK_ASSIGNMENT_STATUS_LABELS, TASK_SUBMISSION_STATUS_LABELS } from '@/api/types';
import type { TaskAssignmentStatus, TaskSubmissionStatus } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<TaskAssignmentStatus, 'success' | 'warning' | 'default'> = {
  ASSIGNED: 'default',
  COMPLETED: 'success',
  CANCELLED: 'warning',
};

const SUBMISSION_STATUS_BADGE: Record<
  TaskSubmissionStatus,
  'success' | 'warning' | 'default' | 'danger'
> = {
  PENDING: 'default',
  SUBMITTED: 'success',
  LATE: 'danger',
  GRADED: 'success',
  RETURNED: 'warning',
};

export function TaskAssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.TASKS_MANAGE);

  const { data: assignment, isLoading, error } = useTaskAssignment(id ?? '');
  const updateMutation = useUpdateTaskAssignment();
  const deactivateMutation = useDeactivateTaskAssignment();
  const markOpenedMutation = useMarkTaskAssignmentOpened();
  const openedRef = useRef<string | null>(null);
  const { data: submission } = useTaskSubmission(id ?? '');
  const { data: submissionAttachments } = useSubmissionAttachments(id ?? '');

  // Trazabilidad de apertura (abrir ≠ completar): una sola vez por visita.
  useEffect(() => {
    if (id && assignment && openedRef.current !== id) {
      openedRef.current = id;
      markOpenedMutation.mutate(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, assignment]);

  const { data: task } = useTask(assignment?.taskId ?? '');
  const { data: studentsData } = useStudents({ limit: 100 });
  const students = studentsData?.data ?? [];
  const student = assignment ? students.find((s) => s.id === assignment.studentId) : undefined;

  const [confirmAction, setConfirmAction] = useState<'complete' | 'cancel' | 'deactivate' | null>(
    null,
  );

  const handleConfirmAction = async () => {
    if (!id || !confirmAction) return;
    try {
      if (confirmAction === 'complete') {
        await updateMutation.mutateAsync({ id, data: { status: 'COMPLETED' } });
      } else if (confirmAction === 'cancel') {
        await updateMutation.mutateAsync({ id, data: { status: 'CANCELLED' } });
      } else if (confirmAction === 'deactivate') {
        await deactivateMutation.mutateAsync(id);
        navigate('/task-assignments');
        return;
      }
      setConfirmAction(null);
    } catch {
      setConfirmAction(null);
    }
  };

  const isTransitionPending = updateMutation.isPending || deactivateMutation.isPending;

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

  if (!assignment) {
    return (
      <ErrorState
        error={{ statusCode: 404, message: 'Asignación no encontrada', timestamp: '', path: '' }}
      />
    );
  }

  const canComplete = canManage && assignment.status === 'ASSIGNED';
  const canCancel = canManage && assignment.status === 'ASSIGNED';
  const canDeactivate = canManage && assignment.status !== 'CANCELLED';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detalle de Asignación"
        description={`Asignación a ${student ? `${student.firstName} ${student.lastName}` : 'estudiante'}`}
        actions={
          <div className="flex gap-2">
            {canComplete && (
              <Button onClick={() => setConfirmAction('complete')}>Marcar completada</Button>
            )}
            {canCancel && (
              <Button variant="secondary" onClick={() => setConfirmAction('cancel')}>
                Cancelar asignación
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Asignación</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={STATUS_BADGE_VARIANT[assignment.status]}>
                  {TASK_ASSIGNMENT_STATUS_LABELS[assignment.status]}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Tarea</dt>
              <dd className="text-gray-900">
                {task?.title ?? assignment.taskId.slice(0, 8) + '…'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estudiante</dt>
              <dd className="text-gray-900">
                {student
                  ? `${student.firstName} ${student.lastName}`
                  : assignment.studentId.slice(0, 8) + '…'}
              </dd>
            </div>
            {assignment.enrollmentId && (
              <div>
                <dt className="text-sm text-gray-500">Inscripción</dt>
                <dd className="text-gray-900 font-mono text-xs break-all">
                  {assignment.enrollmentId}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fechas y Metadatos</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Fecha de asignación</dt>
              <dd className="text-gray-900">
                {new Date(assignment.assignedAt).toLocaleString('es-CO')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">ID</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{assignment.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Creado</dt>
              <dd className="text-gray-900">
                {new Date(assignment.createdAt).toLocaleString('es-CO')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Última actualización</dt>
              <dd className="text-gray-900">
                {new Date(assignment.updatedAt).toLocaleString('es-CO')}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Entrega</h3>
          {submission ? (
            <Button size="sm" onClick={() => navigate(`/task-assignments/${id}`)}>
              Ver entrega
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate(`/task-submissions/${id}/new`)}>
              Crear entrega
            </Button>
          )}
        </div>
        {submission ? (
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={SUBMISSION_STATUS_BADGE[submission.status]}>
                  {TASK_SUBMISSION_STATUS_LABELS[submission.status]}
                </Badge>
              </dd>
            </div>
            {submission.submittedAt && (
              <div>
                <dt className="text-sm text-gray-500">Fecha de entrega</dt>
                <dd className="text-gray-900">
                  {new Date(submission.submittedAt).toLocaleString('es-CO')}
                </dd>
              </div>
            )}
            {submission.grade && (
              <div>
                <dt className="text-sm text-gray-500">Calificación</dt>
                <dd className="text-gray-900">{submission.grade}</dd>
              </div>
            )}
            {submission.feedback && (
              <div>
                <dt className="text-sm text-gray-500">Feedback</dt>
                <dd className="text-gray-900 whitespace-pre-wrap">{submission.feedback}</dd>
              </div>
            )}
            {(submissionAttachments ?? []).length > 0 && (
              <div>
                <dt className="text-sm text-gray-500">Archivos adjuntos</dt>
                <dd>
                  <ul className="mt-1 space-y-1">
                    {(submissionAttachments ?? []).map((a) => (
                      <li key={a.id} className="text-sm text-gray-900">
                        {a.fileAsset.originalName}{' '}
                        <span className="text-xs text-gray-500">
                          ({(a.fileAsset.sizeBytes / 1024).toFixed(0)} KB)
                        </span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-gray-500">No hay entrega registrada para esta asignación.</p>
        )}
      </Card>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/task-assignments')}>
          Volver a asignaciones
        </Button>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmAction === 'complete' && 'Confirmar completado'}
              {confirmAction === 'cancel' && 'Confirmar cancelación'}
              {confirmAction === 'deactivate' && 'Confirmar desactivación'}
            </h3>
            <p className="text-gray-600 mb-6">
              {confirmAction === 'complete' && '¿Deseas marcar esta asignación como completada?'}
              {confirmAction === 'cancel' && '¿Deseas cancelar esta asignación?'}
              {confirmAction === 'deactivate' &&
                '¿Deseas desactivar esta asignación? Esta acción puede revertirse editando la asignación.'}
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
                {confirmAction === 'complete' && 'Marcar completada'}
                {confirmAction === 'cancel' && 'Cancelar asignación'}
                {confirmAction === 'deactivate' && 'Desactivar'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
