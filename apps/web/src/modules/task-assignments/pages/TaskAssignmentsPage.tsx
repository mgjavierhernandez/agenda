import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskAssignments } from '../hooks';
import { useTasks } from '@/modules/tasks/hooks';
import { useStudents } from '@/modules/students/hooks';
import { useParentStudentFilter } from '@/modules/children';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { TASK_ASSIGNMENT_STATUS_LABELS } from '@/api/types';
import type { TaskAssignmentStatus } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<TaskAssignmentStatus, 'success' | 'warning' | 'default'> = {
  ASSIGNED: 'default',
  COMPLETED: 'success',
  CANCELLED: 'warning',
};

export function TaskAssignmentsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.TASKS_MANAGE);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TaskAssignmentStatus | ''>('');
  const [taskFilter, setTaskFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const limit = 20;

  // Padres: entregas del hijo seleccionado (el backend valida el vínculo).
  const { isParent, studentId: childStudentId, selectedChild } = useParentStudentFilter();
  const effectiveStudentId = childStudentId ?? studentFilter ?? undefined;

  const { data: tasksData } = useTasks({ limit: 100 });
  const { data: studentsData } = useStudents({ limit: 100 });

  const tasks = useMemo(() => tasksData?.data ?? [], [tasksData]);
  const students = useMemo(() => studentsData?.data ?? [], [studentsData]);

  const getTaskTitle = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      return task?.title ?? taskId.slice(0, 8) + '…';
    },
    [tasks],
  );

  const getStudentName = useCallback(
    (studentId: string) => {
      const student = students.find((s) => s.id === studentId);
      return student ? `${student.firstName} ${student.lastName}` : studentId.slice(0, 8) + '…';
    },
    [students],
  );

  const { data, isLoading, error } = useTaskAssignments({
    page,
    limit,
    status: (statusFilter as TaskAssignmentStatus) || undefined,
    taskId: taskFilter || undefined,
    studentId: effectiveStudentId || undefined,
  });

  const assignments = data?.data ?? [];
  const meta = data?.meta;

  useEffect(() => {
    setPage(1);
  }, [statusFilter, taskFilter, studentFilter]);

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asignaciones de Tareas"
        description={
          isParent && selectedChild
            ? `Entregas de ${selectedChild.firstName} ${selectedChild.lastName}`
            : 'Gestionar asignaciones de tareas a estudiantes'
        }
        actions={
          canManage ? (
            <Button onClick={() => navigate('/task-assignments/new')}>
              Nueva asignación
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="taskFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Tarea
          </label>
          <select
            id="taskFilter"
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas las tareas</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="studentFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Estudiante
          </label>
          <select
            id="studentFilter"
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos los estudiantes</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-44">
          <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskAssignmentStatus | '')}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="ASSIGNED">Asignada</option>
            <option value="COMPLETED">Completada</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>
        {(statusFilter || taskFilter || studentFilter) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter('');
              setTaskFilter('');
              setStudentFilter('');
              setPage(1);
            }}
            className="text-sm text-blue-600 hover:text-blue-800 mb-1"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState
          title={statusFilter || taskFilter || studentFilter ? 'No se encontraron asignaciones' : 'No hay asignaciones registradas'}
          description={
            statusFilter || taskFilter || studentFilter
              ? 'No encontramos asignaciones que coincidan con los filtros aplicados.'
              : 'Comienza asignando tareas a estudiantes.'
          }
          action={
            canManage && !statusFilter && !taskFilter && !studentFilter ? (
              <Button onClick={() => navigate('/task-assignments/new')}>Nueva asignación</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Card padding="none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Tarea</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estudiante</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Asignada</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={getTaskTitle(assignment.taskId)}>
                        {getTaskTitle(assignment.taskId)}
                      </td>
                      <td className="px-4 py-3 text-gray-900 max-w-[200px] truncate" title={getStudentName(assignment.studentId)}>
                        {getStudentName(assignment.studentId)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[assignment.status]}>
                          {TASK_ASSIGNMENT_STATUS_LABELS[assignment.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(assignment.assignedAt).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/task-assignments/${assignment.id}`)}
                          >
                            Ver
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="md:hidden space-y-3">
            {assignments.map((assignment) => (
              <Card key={assignment.id}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {getTaskTitle(assignment.taskId)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getStudentName(assignment.studentId)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(assignment.assignedAt).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <Badge variant={STATUS_BADGE_VARIANT[assignment.status]}>
                    {TASK_ASSIGNMENT_STATUS_LABELS[assignment.status]}
                  </Badge>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/task-assignments/${assignment.id}`)}
                  >
                    Ver detalle
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Mostrando {(meta.page - 1) * meta.limit + 1}–
                {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span className="flex items-center px-3 text-gray-700">
                  Página {meta.page} de {meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
