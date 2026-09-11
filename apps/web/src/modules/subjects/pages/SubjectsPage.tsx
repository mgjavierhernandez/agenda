import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubjects } from '../hooks';
import { useAreas } from '@/modules/areas/hooks/useAreas';
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
import type { SubjectStatus, SubjectType, EducationLevel } from '@/api/types';
import { EDUCATION_LEVEL_LABELS, SUBJECT_TYPE_LABELS } from '@/api/types';

export function SubjectsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SUBJECTS_MANAGE);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SubjectStatus | ''>('');
  const [areaFilter, setAreaFilter] = useState('');
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: areasData } = useAreas({ limit: 100 });

  const { data, isLoading, error } = useSubjects({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: (statusFilter as SubjectStatus) || undefined,
    areaId: areaFilter || undefined,
  });

  const subjects = data?.data ?? [];
  const meta = data?.meta;

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setAreaFilter('');
    setPage(1);
  }, []);

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asignaturas"
        description="Gestionar asignaturas de la institución"
        actions={
          canManage ? (
            <Button onClick={() => navigate('/subjects/new')}>Nueva asignatura</Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Buscar por código o nombre..."
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
              setStatusFilter(e.target.value as SubjectStatus | '');
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
          <label htmlFor="areaFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Área
          </label>
          <select
            id="areaFilter"
            value={areaFilter}
            onChange={(e) => {
              setAreaFilter(e.target.value);
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas las áreas</option>
            {areasData?.data.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
        {(debouncedSearch || statusFilter || areaFilter) && (
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
      ) : subjects.length === 0 ? (
        <EmptyState
          title={
            debouncedSearch ? 'No se encontraron asignaturas' : 'No hay asignaturas registradas'
          }
          description={
            debouncedSearch
              ? 'No encontramos asignaturas que coincidan con tu búsqueda.'
              : 'Comienza agregando asignaturas a la institución.'
          }
          action={
            canManage && !debouncedSearch ? (
              <Button onClick={() => navigate('/subjects/new')}>Nueva asignatura</Button>
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
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Código</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Área</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Nivel</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{subject.code}</td>
                      <td className="px-4 py-3">{subject.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {areasData?.data.find((a) => a.id === subject.areaId)?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {SUBJECT_TYPE_LABELS[subject.subjectType as SubjectType] ??
                          subject.subjectType}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {subject.minimumLevel && subject.maximumLevel
                          ? `${EDUCATION_LEVEL_LABELS[subject.minimumLevel as EducationLevel]} - ${EDUCATION_LEVEL_LABELS[subject.maximumLevel as EducationLevel]}`
                          : subject.minimumLevel
                            ? `Desde ${EDUCATION_LEVEL_LABELS[subject.minimumLevel as EducationLevel]}`
                            : subject.maximumLevel
                              ? `Hasta ${EDUCATION_LEVEL_LABELS[subject.maximumLevel as EducationLevel]}`
                              : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={subject.status === 'ACTIVE' ? 'success' : 'default'}>
                          {subject.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/subjects/${subject.id}`)}
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
            {subjects.map((subject) => (
              <Card key={subject.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{subject.name}</p>
                    <p className="text-sm text-gray-500 mt-1 font-mono">{subject.code}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Área: {areasData?.data.find((a) => a.id === subject.areaId)?.name || '—'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Tipo:{' '}
                      {SUBJECT_TYPE_LABELS[subject.subjectType as SubjectType] ??
                        subject.subjectType}
                    </p>
                    <p className="text-xs text-gray-500">
                      Nivel:{' '}
                      {subject.minimumLevel && subject.maximumLevel
                        ? `${EDUCATION_LEVEL_LABELS[subject.minimumLevel as EducationLevel]} - ${EDUCATION_LEVEL_LABELS[subject.maximumLevel as EducationLevel]}`
                        : subject.minimumLevel
                          ? `Desde ${EDUCATION_LEVEL_LABELS[subject.minimumLevel as EducationLevel]}`
                          : subject.maximumLevel
                            ? `Hasta ${EDUCATION_LEVEL_LABELS[subject.maximumLevel as EducationLevel]}`
                            : '—'}
                    </p>
                    {subject.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {subject.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={subject.status === 'ACTIVE' ? 'success' : 'default'}>
                    {subject.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/subjects/${subject.id}`)}
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
