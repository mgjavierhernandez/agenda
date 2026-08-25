import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTaskAssignment } from '@/modules/task-assignments/hooks';
import { useTaskSubmission, useGradeTaskSubmission } from '../hooks';
import { useTask } from '@/modules/tasks/hooks';
import { useStudents } from '@/modules/students/hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { TASK_SUBMISSION_STATUS_LABELS, TASK_ASSIGNMENT_STATUS_LABELS } from '@/api/types';
import type { TaskSubmissionStatus, TaskAssignmentStatus } from '@/api/types';
import { getErrorMessage } from '@/api/errors';

const SUBMISSION_STATUS_BADGE: Record<TaskSubmissionStatus, 'success' | 'warning' | 'default' | 'danger'> = {
  PENDING: 'default',
  SUBMITTED: 'success',
  LATE: 'danger',
  GRADED: 'success',
  RETURNED: 'warning',
};

export function TaskSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canGrade = hasPermission(PERMISSIONS.GRADES_MANAGE);

  const { data: assignment, isLoading: isLoadingAssignment, error: assignmentError } = useTaskAssignment(id ?? '');
  const { data: submission, isLoading: isLoadingSubmission, error: submissionError } = useTaskSubmission(id ?? '');
  const { data: task } = useTask(assignment?.taskId ?? '');
  const { data: studentsData } = useStudents({ limit: 100 });
  const gradeMutation = useGradeTaskSubmission();

  const students = studentsData?.data ?? [];
  const student = assignment ? students.find((s) => s.id === assignment.studentId) : undefined;

  const [isGrading, setIsGrading] = useState(false);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [gradeError, setGradeError] = useState('');
  const [apiError, setApiError] = useState('');

  const handleGrade = async () => {
    if (!submission) return;
    setGradeError('');
    setApiError('');

    if (!grade.trim()) {
      setGradeError('La calificación es requerida');
      return;
    }

    const gradeNum = parseFloat(grade);
    if (isNaN(gradeNum) || gradeNum < 0) {
      setGradeError('La calificación debe ser un número positivo');
      return;
    }

    try {
      await gradeMutation.mutateAsync({
        submissionId: submission.id,
        data: {
          grade: grade.trim(),
          feedback: feedback.trim() || undefined,
        },
      });
      setIsGrading(false);
      setGrade('');
      setFeedback('');
    } catch (err) {
      setApiError(getErrorMessage(err) || 'Error al calificar');
    }
  };

  const isLoading = isLoadingAssignment || isLoadingSubmission;
  const error = assignmentError || submissionError;

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
    return <ErrorState error={{ statusCode: 404, message: 'Asignación no encontrada', timestamp: '', path: '' }} />;
  }

  const canSubmit = !submission;
  const canUpdate = submission && submission.status !== 'GRADED';
  const canGradeSubmission = canGrade && submission && submission.status !== 'GRADED';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detalle de Entrega"
        description={
          submission
            ? `Entrega de ${student ? `${student.firstName} ${student.lastName}` : 'estudiante'}`
            : `Sin entrega — ${student ? `${student.firstName} ${student.lastName}` : 'estudiante'}`
        }
        actions={
          <div className="flex gap-2">
            {canSubmit && (
              <Button onClick={() => navigate(`/task-submissions/${id}/new`)}>
                Crear entrega
              </Button>
            )}
            {canUpdate && (
              <Button variant="secondary" onClick={() => navigate(`/task-submissions/${id}/new`)}>
                Actualizar entrega
              </Button>
            )}
            {canGradeSubmission && !isGrading && (
              <Button onClick={() => setIsGrading(true)}>
                Calificar
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Entrega</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                {submission ? (
                  <Badge variant={SUBMISSION_STATUS_BADGE[submission.status]}>
                    {TASK_SUBMISSION_STATUS_LABELS[submission.status]}
                  </Badge>
                ) : (
                  <span className="text-sm text-gray-400">No entregada</span>
                )}
              </dd>
            </div>
            {submission?.content && (
              <div>
                <dt className="text-sm text-gray-500">Contenido</dt>
                <dd className="text-gray-900 whitespace-pre-wrap">{submission.content}</dd>
              </div>
            )}
            {submission?.submittedAt && (
              <div>
                <dt className="text-sm text-gray-500">Fecha de entrega</dt>
                <dd className="text-gray-900">
                  {new Date(submission.submittedAt).toLocaleString('es-CO')}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Asignación</dt>
              <dd>
                <Badge variant={assignment.status === 'COMPLETED' ? 'success' : assignment.status === 'CANCELLED' ? 'warning' : 'default'}>
                  {TASK_ASSIGNMENT_STATUS_LABELS[assignment.status as TaskAssignmentStatus]}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluación</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Calificación</dt>
              <dd className="text-gray-900">
                {submission?.grade ?? 'Sin calificar'}
              </dd>
            </div>
            {submission?.feedback && (
              <div>
                <dt className="text-sm text-gray-500">Feedback</dt>
                <dd className="text-gray-900 whitespace-pre-wrap">{submission.feedback}</dd>
              </div>
            )}
            {submission?.gradedAt && (
              <div>
                <dt className="text-sm text-gray-500">Fecha de calificación</dt>
                <dd className="text-gray-900">
                  {new Date(submission.gradedAt).toLocaleString('es-CO')}
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Tarea</h3>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm text-gray-500">Tarea</dt>
            <dd className="text-gray-900">
              {task?.title ?? assignment.taskId.slice(0, 8) + '…'}
            </dd>
          </div>
          {task?.description && (
            <div>
              <dt className="text-sm text-gray-500">Descripción</dt>
              <dd className="text-gray-900 whitespace-pre-wrap">{task.description}</dd>
            </div>
          )}
          {task?.dueDate && (
            <div>
              <dt className="text-sm text-gray-500">Fecha límite</dt>
              <dd className="text-gray-900">
                {new Date(task.dueDate).toLocaleString('es-CO')}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-gray-500">Estudiante</dt>
            <dd className="text-gray-900">
              {student ? `${student.firstName} ${student.lastName}` : assignment.studentId.slice(0, 8) + '…'}
            </dd>
          </div>
        </dl>
      </Card>

      {isGrading && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Calificar Entrega</h3>
          {apiError && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700 mb-4">
              {apiError}
            </div>
          )}
          <div className="space-y-4">
            <Input
              label="Calificación *"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              error={gradeError}
              disabled={gradeMutation.isPending}
              placeholder="Ej: 85.5"
              type="number"
              step="0.01"
              min="0"
            />
            <div>
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-1">
                Feedback
              </label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={gradeMutation.isPending}
                maxLength={2000}
                rows={4}
                placeholder="Comentarios sobre la entrega..."
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsGrading(false);
                  setGrade('');
                  setFeedback('');
                  setGradeError('');
                  setApiError('');
                }}
                disabled={gradeMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGrade}
                isLoading={gradeMutation.isPending}
              >
                Guardar calificación
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-start gap-3">
        <Button variant="ghost" onClick={() => navigate('/task-submissions')}>
          Volver a entregas
        </Button>
        {submission && (
          <Button
            variant="ghost"
            onClick={() => navigate(`/task-assignments/${id}`)}
          >
            Ver asignación
          </Button>
        )}
      </div>
    </div>
  );
}
