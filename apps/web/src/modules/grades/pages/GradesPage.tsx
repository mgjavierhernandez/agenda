import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGrades } from '../hooks';
import { useSubjects } from '@/modules/subjects/hooks';
import { useParentStudentFilter } from '@/modules/children';
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
import type { GradeStatus } from '@/api/types';

export function GradesPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.GRADES_MANAGE);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<GradeStatus | ''>('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const limit = 20;

  // Padres: las notas pertenecen inequívocamente al hijo seleccionado.
  const { isParent, studentId: childStudentId, selectedChild } = useParentStudentFilter();
  const { data: subjectsData } = useSubjects({ limit: 100 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error, refetch } = useGrades({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: (statusFilter as GradeStatus) || undefined,
    period: periodFilter || undefined,
    subjectId: subjectFilter || undefined,
    studentId: childStudentId,
  });

  const grades = data?.data ?? [];
  const meta = data?.meta;

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setPeriodFilter('');
    setSubjectFilter('');
    setPage(1);
  }, []);

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calificaciones"
        description={
          isParent && selectedChild
            ? `Notas de ${selectedChild.firstName} ${selectedChild.lastName}`
            : 'Gestionar calificaciones de la institución'
        }
        actions={
          canManage ? (
            <Button onClick={() => navigate('/grades/new')}>
              Nueva calificación
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Buscar por período, tipo o descripción..."
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
              setStatusFilter(e.target.value as GradeStatus | '');
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
          </select>
        </div>
        <div className="w-full sm:w-40">
          <Input
            label="Período"
            placeholder="Ej: Q1"
            value={periodFilter}
            onChange={(e) => {
              setPeriodFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full sm:w-48">
          <label htmlFor="subjectFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Materia
          </label>
          <select
            id="subjectFilter"
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value);
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            {(subjectsData?.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {(debouncedSearch || statusFilter || periodFilter || subjectFilter) && (
          <button
            type="button"
            onClick={handleClearFilters}
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
      ) : grades.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? 'No se encontraron calificaciones' : 'No hay calificaciones registradas'}
          description={
            debouncedSearch
              ? 'No encontramos calificaciones que coincidan con tu búsqueda.'
              : 'Comienza agregando calificaciones a la institución.'
          }
          action={
            canManage && !debouncedSearch ? (
              <Button onClick={() => navigate('/grades/new')}>Nueva calificación</Button>
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
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estudiante</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Curso</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Asignatura</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Valor</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Período</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((grade) => (
                    <tr key={grade.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs" title={grade.studentId}>
                        {grade.studentId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" title={grade.courseId}>
                        {grade.courseId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" title={grade.subjectId}>
                        {grade.subjectId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 font-semibold">{grade.value}</td>
                      <td className="px-4 py-3">{grade.period}</td>
                      <td className="px-4 py-3">
                        <Badge variant={grade.status === 'ACTIVE' ? 'success' : 'default'}>
                          {grade.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/grades/${grade.id}`)}
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
            {grades.map((grade) => (
              <Card key={grade.id}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900 text-lg">
                      {grade.value}
                    </p>
                    <p className="text-sm text-gray-500">
                      Período: {grade.period}
                    </p>
                    {grade.evaluationType && (
                      <p className="text-sm text-gray-500">
                        Tipo: {grade.evaluationType}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 font-mono">
                      Estudiante: {grade.studentId.slice(0, 8)}…
                    </p>
                  </div>
                  <Badge variant={grade.status === 'ACTIVE' ? 'success' : 'default'}>
                    {grade.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/grades/${grade.id}`)}
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
