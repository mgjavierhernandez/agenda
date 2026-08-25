import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTask, usePublishTask, useCloseTask, useDeactivateTask } from '../hooks';
import { useTaskAssignments } from '@/modules/task-assignments/hooks';
import { useTaskAttachments, useCreateTaskAttachment } from '@/modules/files/hooks';
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
import { TASK_STATUS_LABELS } from '@/api/types';
import type { TaskStatus, FileAsset } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<TaskStatus, 'success' | 'warning' | 'default' | 'danger'> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  CLOSED: 'warning',
  INACTIVE: 'danger',
};

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.TASKS_MANAGE);

  const { data: task, isLoading, error } = useTask(id ?? '');
  const publishMutation = usePublishTask();
  const closeMutation = useCloseTask();
  const deactivateMutation = useDeactivateTask();
  const { data: assignmentsData } = useTaskAssignments({ taskId: id ?? '' });
  const assignments = assignmentsData?.data ?? [];
  const { data: attachments = [], refetch: refetchAttachments } = useTaskAttachments(id ?? '');
  const createAttachmentMutation = useCreateTaskAttachment();
  const canAttach = canManage && (task?.status === 'DRAFT' || task?.status === 'PUBLISHED');

  const handleUploadComplete = async (fileAsset: FileAsset) => {
    if (!id) return;
    await createAttachmentMutation.mutateAsync({ taskId: id, fileAssetId: fileAsset.id });
  };

  const [confirmAction, setConfirmAction] = useState<'publish' | 'close' | 'deactivate' | null>(null);

  const handleConfirmAction = async () => {
    if (!id || !confirmAction) return;
    try {
      if (confirmAction === 'publish') {
        await publishMutation.mutateAsync(id);
      } else if (confirmAction === 'close') {
        await closeMutation.mutateAsync(id);
      } else if (confirmAction === 'deactivate') {
        await deactivateMutation.mutateAsync(id);
        navigate('/tasks');
        return;
      }
      setConfirmAction(null);
    } catch {
      setConfirmAction(null);
    }
  };

  const isTransitionPending = publishMutation.isPending || closeMutation.isPending || deactivateMutation.isPending;

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

  if (!task) {
    return <ErrorState error={{ statusCode: 404, message: 'Tarea no encontrada', timestamp: '', path: '' }} />;
  }

  const canEdit = canManage && task.status === 'DRAFT';
  const canPublish = canManage && task.status === 'DRAFT';
  const canClose = canManage && task.status === 'PUBLISHED';
  const canDeactivate = canManage && task.status !== 'INACTIVE';

  return (
    <div className="space-y-6">
      <PageHeader
        title={task.title}
        description={task.description ?? 'Sin descripción'}
        actions={
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="secondary" onClick={() => navigate(`/tasks/${id}/edit`)}>
                Editar
              </Button>
            )}
            {canPublish && (
              <Button onClick={() => setConfirmAction('publish')}>
                Publicar
              </Button>
            )}
            {canClose && (
              <Button variant="secondary" onClick={() => setConfirmAction('close')}>
                Cerrar
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Tarea</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Título</dt>
              <dd className="text-gray-900">{task.title}</dd>
            </div>
            {task.description && (
              <div>
                <dt className="text-sm text-gray-500">Descripción</dt>
                <dd className="text-gray-900 whitespace-pre-wrap">{task.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Fecha límite</dt>
              <dd className="text-gray-900">
                {new Date(task.dueDate).toLocaleString('es-CO')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={STATUS_BADGE_VARIANT[task.status]}>
                  {TASK_STATUS_LABELS[task.status]}
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
              <dd className="text-gray-900 font-mono text-xs break-all">{task.courseId}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Asignatura</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{task.subjectId}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">ID</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{task.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Creado</dt>
              <dd className="text-gray-900">
                {new Date(task.createdAt).toLocaleString('es-CO')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Última actualización</dt>
              <dd className="text-gray-900">
                {new Date(task.updatedAt).toLocaleString('es-CO')}
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

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Asignaciones</h3>
          {canManage && task.status === 'PUBLISHED' && (
            <Button
              size="sm"
              onClick={() => navigate(`/task-assignments/new`)}
            >
              Nueva asignación
            </Button>
          )}
        </div>
        {assignments.length === 0 ? (
          <p className="text-sm text-gray-500">No hay asignaciones para esta tarea.</p>
        ) : (
          <div className="text-sm text-gray-600">
            <p>
              {assignments.length} asignacion{assignments.length !== 1 ? 'es' : ''} registrada{assignments.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-3 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/task-assignments`)}
              >
                Ver todas las asignaciones
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/task-submissions`)}
              >
                Ver entregas
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/tasks')}>
          Volver a tareas
        </Button>
      </div>

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmAction === 'publish' && 'Confirmar publicación'}
              {confirmAction === 'close' && 'Confirmar cierre'}
              {confirmAction === 'deactivate' && 'Confirmar desactivación'}
            </h3>
            <p className="text-gray-600 mb-6">
              {confirmAction === 'publish' && `¿Deseas publicar la tarea "${task.title}"? Una vez publicada, los estudiantes podrán verla y asignarla.`}
              {confirmAction === 'close' && `¿Deseas cerrar la tarea "${task.title}"? No se podrán recibir nuevas entregas.`}
              {confirmAction === 'deactivate' && `¿Deseas desactivar la tarea "${task.title}"? Esta acción puede revertirse editando la tarea.`}
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
                {confirmAction === 'close' && 'Cerrar'}
                {confirmAction === 'deactivate' && 'Desactivar'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
