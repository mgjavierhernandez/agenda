import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchedules } from '../hooks';
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
import type { ScheduleStatus, DayOfWeek } from '@/api/types';
import { DAY_OF_WEEK_LABELS } from '@/api/types';

export function SchedulesPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SCHEDULES_MANAGE);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | ''>('');
  const [dayOfWeekFilter, setDayOfWeekFilter] = useState<DayOfWeek | ''>('');
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = useSchedules({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: (statusFilter as ScheduleStatus) || undefined,
    dayOfWeek: (dayOfWeekFilter as DayOfWeek) || undefined,
  });

  const schedules = data?.data ?? [];
  const meta = data?.meta;

  const handleClearSearch = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setDayOfWeekFilter('');
    setPage(1);
  }, []);

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horarios"
        description="Gestionar horarios de clases de la institución"
        actions={
          canManage ? (
            <Button onClick={() => navigate('/schedules/new')}>
              Nuevo horario
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Buscar por aula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-40">
          <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ScheduleStatus | '');
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
          </select>
        </div>
        <div className="w-full sm:w-48">
          <label htmlFor="dayOfWeekFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Día
          </label>
          <select
            id="dayOfWeekFilter"
            value={dayOfWeekFilter}
            onChange={(e) => {
              setDayOfWeekFilter(e.target.value as DayOfWeek | '');
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="MONDAY">Lunes</option>
            <option value="TUESDAY">Martes</option>
            <option value="WEDNESDAY">Miércoles</option>
            <option value="THURSDAY">Jueves</option>
            <option value="FRIDAY">Viernes</option>
            <option value="SATURDAY">Sábado</option>
            <option value="SUNDAY">Domingo</option>
          </select>
        </div>
        {(debouncedSearch || statusFilter || dayOfWeekFilter) && (
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
      ) : schedules.length === 0 ? (
        <EmptyState
          title={debouncedSearch || statusFilter || dayOfWeekFilter ? 'No se encontraron horarios' : 'No hay horarios registrados'}
          description={
            debouncedSearch || statusFilter || dayOfWeekFilter
              ? 'No encontramos horarios que coincidan con los filtros aplicados.'
              : 'Comienza agregando horarios de clases a la institución.'
          }
          action={
            canManage && !debouncedSearch && !statusFilter && !dayOfWeekFilter ? (
              <Button onClick={() => navigate('/schedules/new')}>Nuevo horario</Button>
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
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Día</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Inicio</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Fin</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Curso</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Asignatura</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Aula</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">{DAY_OF_WEEK_LABELS[schedule.dayOfWeek]}</td>
                      <td className="px-4 py-3 font-mono text-xs">{schedule.startTime}</td>
                      <td className="px-4 py-3 font-mono text-xs">{schedule.endTime}</td>
                      <td className="px-4 py-3 font-mono text-xs" title={schedule.courseId}>
                        {schedule.courseId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" title={schedule.subjectId}>
                        {schedule.subjectId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3">{schedule.classroom ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={schedule.status === 'ACTIVE' ? 'success' : 'default'}>
                          {schedule.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/schedules/${schedule.id}`)}
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
            {schedules.map((schedule) => (
              <Card key={schedule.id}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900 text-lg">
                      {DAY_OF_WEEK_LABELS[schedule.dayOfWeek]}
                    </p>
                    <p className="text-sm text-gray-500">
                      {schedule.startTime} — {schedule.endTime}
                    </p>
                    {schedule.classroom && (
                      <p className="text-sm text-gray-500">
                        Aula: {schedule.classroom}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 font-mono">
                      Curso: {schedule.courseId.slice(0, 8)}…
                    </p>
                  </div>
                  <Badge variant={schedule.status === 'ACTIVE' ? 'success' : 'default'}>
                    {schedule.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/schedules/${schedule.id}`)}
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
