import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import type { TaskStatus } from '@/api/types';
import { TASK_STATUS_LABELS } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<TaskStatus, 'success' | 'warning' | 'default' | 'danger'> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  CLOSED: 'warning',
  INACTIVE: 'danger',
};

export function TasksPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.TASKS_MANAGE);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = useTasks({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: (statusFilter as TaskStatus) || undefined,
  });

  const tasks = data?.data ?? [];
  const meta = data?.meta;

  const handleClearSearch = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setPage(1);
  }, []);

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tareas"
        description="Gestionar tareas académicas de la institución"
        actions={
          canManage ? (
            <Button onClick={() => navigate('/tasks/new')}>
              Nueva tarea
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Buscar por título o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as TaskStatus | '');
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="DRAFT">Borrador</option>
            <option value="PUBLISHED">Publicada</option>
            <option value="CLOSED">Cerrada</option>
            <option value="INACTIVE">Inactiva</option>
          </select>
        </div>
        {(debouncedSearch || statusFilter) && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="text-sm text-blue-600 hover:text-blue-800 self-end mb-1"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title={debouncedSearch || statusFilter ? 'No se encontraron tareas' : 'No hay tareas registradas'}
          description={
            debouncedSearch || statusFilter
              ? 'No encontramos tareas que coincidan con los filtros aplicados.'
              : 'Comienza agregando tareas académicas a la institución.'
          }
          action={
            canManage && !debouncedSearch && !statusFilter ? (
              <Button onClick={() => navigate('/tasks/new')}>Nueva tarea</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Card padding="none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Título</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Curso</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Asignatura</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha límite</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={task.title}>
                        {task.title}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" title={task.courseId}>
                        {task.courseId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" title={task.subjectId}>
                        {task.subjectId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3">
                        {new Date(task.dueDate).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[task.status]}>
                          {TASK_STATUS_LABELS[task.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/tasks/${task.id}`)}
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

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {tasks.map((task) => (
              <Card key={task.id}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-lg truncate">
                      {task.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      Vence: {new Date(task.dueDate).toLocaleDateString('es-CO')}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      Curso: {task.courseId.slice(0, 8)}…
                    </p>
                  </div>
                  <Badge variant={STATUS_BADGE_VARIANT[task.status]}>
                    {TASK_STATUS_LABELS[task.status]}
                  </Badge>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    Ver detalle
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
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
