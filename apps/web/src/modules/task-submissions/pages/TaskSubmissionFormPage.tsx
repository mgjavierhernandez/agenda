import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTaskAssignment } from '@/modules/task-assignments/hooks';
import { useTask } from '@/modules/tasks/hooks';
import {
  useCreateTaskSubmission,
  useUpdateTaskSubmission,
  useTaskSubmission,
  useSubmissionAttachments,
  useRemoveSubmissionAttachment,
} from '../hooks';
import { FileUploader } from '@/modules/files/components/FileUploader';
import type { FileAsset } from '@/api/types';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { getErrorMessage } from '@/api/errors';

export function TaskSubmissionFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: assignment, isLoading: isLoadingAssignment } = useTaskAssignment(id ?? '');
  const { data: existingSubmission, isLoading: isLoadingSubmission } = useTaskSubmission(id ?? '');
  const { data: task } = useTask(assignment?.taskId ?? '');
  const createMutation = useCreateTaskSubmission();
  const updateMutation = useUpdateTaskSubmission();

  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  // Archivos subidos en esta sesión (aún no vinculados).
  const [pendingFiles, setPendingFiles] = useState<FileAsset[]>([]);
  const { data: existingAttachments } = useSubmissionAttachments(id ?? '');
  const removeAttachmentMutation = useRemoveSubmissionAttachment();

  const isEditing = !!existingSubmission;

  useEffect(() => {
    if (existingSubmission) {
      setContent(existingSubmission.content ?? '');
    }
  }, [existingSubmission]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (content.length > 5000) newErrors.content = 'Máximo 5000 caracteres';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate() || !id) return;

    try {
      const fileAssetIds = pendingFiles.map((f) => f.id);
      if (isEditing && existingSubmission) {
        await updateMutation.mutateAsync({
          assignmentId: id,
          data: {
            content: content.trim() || undefined,
            fileAssetIds: fileAssetIds.length > 0 ? fileAssetIds : undefined,
          },
        });
      } else {
        await createMutation.mutateAsync({
          assignmentId: id,
          data: {
            content: content.trim() || undefined,
            fileAssetIds: fileAssetIds.length > 0 ? fileAssetIds : undefined,
          },
        });
      }
      navigate(`/task-assignments/${id}`);
    } catch (err) {
      setApiError(getErrorMessage(err) || 'Ocurrió un error inesperado');
    }
  };

  if (isLoadingAssignment || isLoadingSubmission) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <ErrorState
        error={{ statusCode: 404, message: 'Asignación no encontrada', timestamp: '', path: '' }}
      />
    );
  }

  if (existingSubmission && existingSubmission.status === 'GRADED') {
    return (
      <ErrorState
        error={{
          statusCode: 400,
          message: 'No se puede modificar una entrega calificada',
          timestamp: '',
          path: '',
        }}
      />
    );
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={isEditing ? 'Actualizar entrega' : 'Nueva entrega'}
        description={
          isEditing ? 'Actualizar el contenido de tu entrega' : 'Enviar tu entrega para la tarea'
        }
      />

      {task && (
        <Card>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Tarea</h3>
          <p className="text-gray-900">{task.title}</p>
          {task.dueDate && (
            <p className="text-sm text-gray-500 mt-1">
              Fecha límite: {new Date(task.dueDate).toLocaleString('es-CO')}
            </p>
          )}
        </Card>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {apiError && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Contenido de la entrega
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
              maxLength={5000}
              rows={8}
              placeholder="Escribe o pega el contenido de tu entrega aquí..."
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
            <p className="mt-1 text-xs text-gray-500">{content.length}/5000 caracteres</p>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">Archivos adjuntos</span>
            <p className="text-xs text-gray-500 mb-2">
              Formatos: .doc, .docx, .xls, .xlsx, .pdf (máx. 10 MB por archivo, hasta 10 archivos).
            </p>
            <FileUploader
              onUploadComplete={(file) => {
                if (pendingFiles.length >= 10) return;
                setPendingFiles((prev) =>
                  prev.some((f) => f.id === file.id) ? prev : [...prev, file],
                );
              }}
              disabled={isSubmitting || pendingFiles.length >= 10}
            />
            {pendingFiles.length > 0 && (
              <ul className="mt-3 space-y-2">
                {pendingFiles.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-gray-900" title={f.originalName}>
                      {f.originalName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingFiles((prev) => prev.filter((p) => p.id !== f.id))}
                      className="text-sm text-red-600 hover:text-red-800"
                      aria-label={`Quitar ${f.originalName}`}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {isEditing && (existingAttachments ?? []).length > 0 && (
              <ul className="mt-3 space-y-2">
                {(existingAttachments ?? []).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-gray-700" title={a.fileAsset.originalName}>
                      {a.fileAsset.originalName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (id)
                          removeAttachmentMutation.mutate({ assignmentId: id, attachmentId: a.id });
                      }}
                      className="text-sm text-red-600 hover:text-red-800"
                      aria-label={`Eliminar ${a.fileAsset.originalName}`}
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/task-assignments/${id}`)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? 'Actualizar entrega' : 'Enviar entrega'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
