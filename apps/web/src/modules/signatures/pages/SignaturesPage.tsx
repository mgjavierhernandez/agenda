import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignatures } from '../hooks';
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
import type { SignatureRequestStatus } from '@/api/types';
import { SIGNATURE_REQUEST_STATUS_LABELS } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<SignatureRequestStatus, 'success' | 'warning' | 'default' | 'danger' | 'info'> = {
  DRAFT: 'default',
  PUBLISHED: 'info',
  COMPLETED: 'success',
  EXPIRED: 'danger',
  INACTIVE: 'warning',
};

export function SignaturesPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canRequest = hasPermission(PERMISSIONS.SIGNATURES_REQUEST);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SignatureRequestStatus | ''>('');
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = useSignatures({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: (statusFilter as SignatureRequestStatus) || undefined,
  });

  const signatures = data?.data ?? [];
  const meta = data?.meta;

  const handleClearFilters = useCallback(() => {
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
        title="Firmas"
        description="Gestionar solicitudes de firma digital"
        actions={
          canRequest ? (
            <Button onClick={() => navigate('/signatures/new')}>
              Nueva solicitud
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
              setStatusFilter(e.target.value as SignatureRequestStatus | '');
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="DRAFT">Borrador</option>
            <option value="PUBLISHED">Publicada</option>
            <option value="COMPLETED">Completada</option>
            <option value="EXPIRED">Expirada</option>
            <option value="INACTIVE">Inactiva</option>
          </select>
        </div>
        {(debouncedSearch || statusFilter) && (
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
      ) : signatures.length === 0 ? (
        <EmptyState
          title={debouncedSearch || statusFilter ? 'No se encontraron solicitudes' : 'No hay solicitudes de firma'}
          description={
            debouncedSearch || statusFilter
              ? 'No encontramos solicitudes que coincidan con los filtros aplicados.'
              : 'Comienza creando una solicitud de firma.'
          }
          action={
            canRequest && !debouncedSearch && !statusFilter ? (
              <Button onClick={() => navigate('/signatures/new')}>Nueva solicitud</Button>
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
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Firmantes</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha límite</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {signatures.map((sig) => {
                    const signedCount = sig.recipients?.filter((r) => r.status === 'SIGNED').length ?? 0;
                    const totalCount = sig.recipients?.length ?? 0;
                    return (
                      <tr key={sig.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={sig.title}>
                          {sig.title}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {signedCount}/{totalCount}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_BADGE_VARIANT[sig.status]}>
                            {SIGNATURE_REQUEST_STATUS_LABELS[sig.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {sig.dueDate
                            ? new Date(sig.dueDate).toLocaleDateString('es-CO')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/signatures/${sig.id}`)}
                            >
                              Ver
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="md:hidden space-y-3">
            {signatures.map((sig) => {
              const signedCount = sig.recipients?.filter((r) => r.status === 'SIGNED').length ?? 0;
              const totalCount = sig.recipients?.length ?? 0;
              return (
                <Card key={sig.id}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-lg truncate">
                        {sig.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        Firmantes: {signedCount}/{totalCount}
                      </p>
                      <p className="text-sm text-gray-500">
                        {sig.dueDate
                          ? `Vence: ${new Date(sig.dueDate).toLocaleDateString('es-CO')}`
                          : 'Sin fecha límite'}
                      </p>
                    </div>
                    <Badge variant={STATUS_BADGE_VARIANT[sig.status]}>
                      {SIGNATURE_REQUEST_STATUS_LABELS[sig.status]}
                    </Badge>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/signatures/${sig.id}`)}
                    >
                      Ver detalle
                    </Button>
                  </div>
                </Card>
              );
            })}
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
