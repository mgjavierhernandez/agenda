import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskAssignments } from '@/modules/task-assignments/hooks';
import { useTaskSubmission } from '../hooks';
import { useTasks } from '@/modules/tasks/hooks';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { TASK_SUBMISSION_STATUS_LABELS, TASK_STATUS_LABELS } from '@/api/types';
import type { TaskSubmissionStatus, TaskStatus, TaskSubmission, TaskAssignment } from '@/api/types';

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

interface AssignmentWithSubmission {
  assignment: TaskAssignment;
  submission: TaskSubmission | null;
  isLoadingSubmission: boolean;
}

function AssignmentRow({
  item,
  onNavigate,
}: {
  item: AssignmentWithSubmission;
  onNavigate: (assignmentId: string) => void;
}) {
  const { assignment, submission, isLoadingSubmission } = item;

  return (
    <tr
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
      onClick={() => onNavigate(assignment.id)}
    >
      <td className="px-4 py-3 font-mono text-xs text-gray-900" title={assignment.id}>
        {assignment.studentId.slice(0, 8)}…
      </td>
      <td className="px-4 py-3">
        {isLoadingSubmission ? (
          <Spinner size="sm" />
        ) : submission ? (
          <Badge variant={SUBMISSION_STATUS_BADGE[submission.status]}>
            {TASK_SUBMISSION_STATUS_LABELS[submission.status]}
          </Badge>
        ) : (
          <span className="text-sm text-gray-500">Sin entrega</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{submission?.grade ?? '—'}</td>
      <td className="px-4 py-3">
        {submission?.submittedAt ? new Date(submission.submittedAt).toLocaleString('es-CO') : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(assignment.id);
          }}
        >
          Ver
        </Button>
      </td>
    </tr>
  );
}

function AssignmentCard({
  item,
  onNavigate,
}: {
  item: AssignmentWithSubmission;
  onNavigate: (assignmentId: string) => void;
}) {
  const { assignment, submission, isLoadingSubmission } = item;

  return (
    <Card key={assignment.id}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            Estudiante: {assignment.studentId.slice(0, 8)}…
          </p>
          <p className="text-sm text-gray-500">
            Asignada: {new Date(assignment.assignedAt).toLocaleDateString('es-CO')}
          </p>
          {submission?.submittedAt && (
            <p className="text-xs text-gray-500">
              Entregada: {new Date(submission.submittedAt).toLocaleString('es-CO')}
            </p>
          )}
          {submission?.grade && (
            <p className="text-xs text-gray-500">Calificación: {submission.grade}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {isLoadingSubmission ? (
            <Spinner size="sm" />
          ) : submission ? (
            <Badge variant={SUBMISSION_STATUS_BADGE[submission.status]}>
              {TASK_SUBMISSION_STATUS_LABELS[submission.status]}
            </Badge>
          ) : (
            <span className="text-sm text-gray-500">Sin entrega</span>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => onNavigate(assignment.id)}>
          Ver detalle
        </Button>
      </div>
    </Card>
  );
}

function SubmissionFetcher({
  assignment,
  children,
}: {
  assignment: TaskAssignment;
  children: (item: AssignmentWithSubmission) => React.ReactNode;
}) {
  const { data: submission, isLoading } = useTaskSubmission(assignment.id);
  return children({ assignment, submission: submission ?? null, isLoadingSubmission: isLoading });
}

export function TaskSubmissionsPage() {
  const navigate = useNavigate();
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const { data: tasksData, isLoading: isLoadingTasks } = useTasks({ limit: 100 });
  const { data: assignmentsData, isLoading: isLoadingAssignments } = useTaskAssignments({
    taskId: selectedTaskId || undefined,
  });

  const tasks = useMemo(() => tasksData?.data ?? [], [tasksData]);
  const assignments = useMemo(() => assignmentsData?.data ?? [], [assignmentsData]);

  const getTaskTitle = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      return task?.title ?? taskId.slice(0, 8) + '…';
    },
    [tasks],
  );

  const handleNavigateToDetail = (assignmentId: string) => {
    navigate(`/task-assignments/${assignmentId}`);
  };

  if (isLoadingTasks) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Entregas de tareas" description="Consultar entregas de tareas por tarea" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="taskFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Tarea *
          </label>
          <select
            id="taskFilter"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Seleccionar tarea</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({TASK_STATUS_LABELS[t.status as TaskStatus] ?? t.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedTaskId ? (
        <EmptyState
          title="Selecciona una tarea"
          description="Selecciona una tarea para ver las entregas de sus asignaciones."
        />
      ) : isLoadingAssignments ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState
          title="No hay asignaciones"
          description="Esta tarea no tiene asignaciones registradas."
          action={
            <Button onClick={() => navigate(`/task-assignments/new`)}>Crear asignación</Button>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Card padding="none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estudiante</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Calificación</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Fecha de entrega
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <SubmissionFetcher key={assignment.id} assignment={assignment}>
                      {(item) => <AssignmentRow item={item} onNavigate={handleNavigateToDetail} />}
                    </SubmissionFetcher>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="md:hidden space-y-3">
            {assignments.map((assignment) => (
              <SubmissionFetcher key={assignment.id} assignment={assignment}>
                {(item) => <AssignmentCard item={item} onNavigate={handleNavigateToDetail} />}
              </SubmissionFetcher>
            ))}
          </div>

          <div className="text-sm text-gray-500">
            {assignments.length} asignacion{assignments.length !== 1 ? 'es' : ''} para{' '}
            {getTaskTitle(selectedTaskId)}
          </div>
        </>
      )}
    </div>
  );
}
