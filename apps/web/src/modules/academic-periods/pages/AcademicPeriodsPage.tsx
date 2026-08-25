import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAcademicPeriods } from '../hooks';
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
import type { AcademicPeriodStatus } from '@/api/types';
import { ACADEMIC_PERIOD_STATUS_LABELS } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<AcademicPeriodStatus, 'success' | 'default'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
};

export function AcademicPeriodsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.ACADEMIC_PERIODS_MANAGE);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = useAcademicPeriods({
    page,
    limit,
    search: debouncedSearch || undefined,
  });

  const periods = data?.data ?? [];
  const meta = data?.meta;

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  }, []);

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Periodos académicos"
        description="Gestionar los periodos académicos de la institución"
        actions={
          canManage ? (
            <Button onClick={() => navigate('/academic-periods/new')}>
              Nuevo periodo
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {debouncedSearch && (
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
      ) : periods.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? 'No se encontraron periodos' : 'No hay periodos académicos'}
          description={
            debouncedSearch
              ? 'No encontramos periodos que coincidan con la búsqueda.'
              : 'Comienza creando un periodo académico.'
          }
          action={
            canManage && !debouncedSearch ? (
              <Button onClick={() => navigate('/academic-periods/new')}>Nuevo periodo</Button>
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
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Código</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha inicio</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha fin</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={period.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={period.name}>
                        {period.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {period.code}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(period.startDate).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(period.endDate).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[period.status]}>
                          {ACADEMIC_PERIOD_STATUS_LABELS[period.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/academic-periods/${period.id}`)}
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
            {periods.map((period) => (
              <Card key={period.id}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-lg truncate">
                      {period.name}
                    </p>
                    <p className="text-sm text-gray-500 font-mono">
                      {period.code}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(period.startDate).toLocaleDateString('es-CO')} – {new Date(period.endDate).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <Badge variant={STATUS_BADGE_VARIANT[period.status]}>
                    {ACADEMIC_PERIOD_STATUS_LABELS[period.status]}
                  </Badge>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/academic-periods/${period.id}`)}
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
