import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommunications } from '../hooks';
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
import type { CommunicationStatus, CommunicationAudience } from '@/api/types';
import { COMMUNICATION_STATUS_LABELS, COMMUNICATION_AUDIENCE_LABELS } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<CommunicationStatus, 'success' | 'warning' | 'default' | 'danger'> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  INACTIVE: 'danger',
};

const AUDIENCE_BADGE_VARIANT: Record<CommunicationAudience, 'info' | 'success' | 'warning' | 'default'> = {
  ALL: 'default',
  TEACHERS: 'success',
  PARENTS: 'warning',
  STUDENTS: 'info',
};

export function CommunicationsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.COMMUNICATIONS_MANAGE);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CommunicationStatus | ''>('');
  const [audienceFilter, setAudienceFilter] = useState<CommunicationAudience | ''>('');
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = useCommunications({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: (statusFilter as CommunicationStatus) || undefined,
    audience: (audienceFilter as CommunicationAudience) || undefined,
  });

  const communications = data?.data ?? [];
  const meta = data?.meta;

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setAudienceFilter('');
    setPage(1);
  }, []);

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicaciones"
        description="Gestionar comunicaciones institucionales"
        actions={
          canManage ? (
            <Button onClick={() => navigate('/communications/new')}>
              Nueva comunicación
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Buscar por título o contenido..."
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
              setStatusFilter(e.target.value as CommunicationStatus | '');
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="DRAFT">Borrador</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="INACTIVE">Inactivo</option>
          </select>
        </div>
        <div className="w-full sm:w-44">
          <label htmlFor="audienceFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Audiencia
          </label>
          <select
            id="audienceFilter"
            value={audienceFilter}
            onChange={(e) => {
              setAudienceFilter(e.target.value as CommunicationAudience | '');
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            <option value="ALL">Todos</option>
            <option value="TEACHERS">Docentes</option>
            <option value="PARENTS">Padres</option>
            <option value="STUDENTS">Estudiantes</option>
          </select>
        </div>
        {(debouncedSearch || statusFilter || audienceFilter) && (
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
      ) : communications.length === 0 ? (
        <EmptyState
          title={debouncedSearch || statusFilter || audienceFilter ? 'No se encontraron comunicaciones' : 'No hay comunicaciones registradas'}
          description={
            debouncedSearch || statusFilter || audienceFilter
              ? 'No encontramos comunicaciones que coincidan con los filtros aplicados.'
              : 'Comienza agregando comunicaciones a la institución.'
          }
          action={
            canManage && !debouncedSearch && !statusFilter && !audienceFilter ? (
              <Button onClick={() => navigate('/communications/new')}>Nueva comunicación</Button>
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
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Título</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Audiencia</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Creado</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {communications.map((comm) => (
                    <tr key={comm.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={comm.title}>
                        {comm.title}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={AUDIENCE_BADGE_VARIANT[comm.audience]}>
                          {COMMUNICATION_AUDIENCE_LABELS[comm.audience]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[comm.status]}>
                          {COMMUNICATION_STATUS_LABELS[comm.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(comm.createdAt).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/communications/${comm.id}`)}
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
            {communications.map((comm) => (
              <Card key={comm.id}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-lg truncate">
                      {comm.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(comm.createdAt).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={AUDIENCE_BADGE_VARIANT[comm.audience]}>
                      {COMMUNICATION_AUDIENCE_LABELS[comm.audience]}
                    </Badge>
                    <Badge variant={STATUS_BADGE_VARIANT[comm.status]}>
                      {COMMUNICATION_STATUS_LABELS[comm.status]}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/communications/${comm.id}`)}
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
