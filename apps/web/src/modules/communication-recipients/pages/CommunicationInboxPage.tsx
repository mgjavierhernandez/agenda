import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommunicationRecipients, useMarkAllCommunicationsAsRead } from '../hooks';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import type { CommunicationRecipientStatus } from '@/api/types';
import { COMMUNICATION_RECIPIENT_STATUS_LABELS } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<CommunicationRecipientStatus, 'success' | 'default'> = {
  READ: 'success',
  DELIVERED: 'default',
};

export function CommunicationInboxPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CommunicationRecipientStatus | ''>('');
  const limit = 20;

  const { data, isLoading, error } = useCommunicationRecipients({
    page,
    limit,
    status: (statusFilter as CommunicationRecipientStatus) || undefined,
  });

  const markAllReadMutation = useMarkAllCommunicationsAsRead();
  const recipients = data?.data ?? [];
  const meta = data?.meta;

  const handleClearFilter = useCallback(() => {
    setStatusFilter('');
    setPage(1);
  }, []);

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bandeja de entrada"
        description="Comunicaciones recibidas"
        actions={
          <Button
            variant="secondary"
            onClick={() => markAllReadMutation.mutateAsync()}
            isLoading={markAllReadMutation.isPending}
          >
            Marcar todo como leído
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="w-full sm:w-44">
          <label htmlFor="recipientStatusFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            id="recipientStatusFilter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as CommunicationRecipientStatus | '');
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="DELIVERED">Sin leer</option>
            <option value="READ">Leídos</option>
          </select>
        </div>
        {statusFilter && (
          <button
            type="button"
            onClick={handleClearFilter}
            className="text-sm text-blue-600 hover:text-blue-800 self-end mb-1"
          >
            Limpiar filtro
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : recipients.length === 0 ? (
        <EmptyState
          title={statusFilter ? 'No se encontraron comunicaciones' : 'No hay comunicaciones recibidas'}
          description={
            statusFilter
              ? 'No hay comunicaciones que coincidan con el filtro.'
              : 'No tienes comunicaciones recibidas aún.'
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
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Recibido</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((recipient) => (
                    <tr
                      key={recipient.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        recipient.status === 'DELIVERED' ? 'bg-blue-50/30' : ''
                      }`}
                      onClick={() => navigate(`/communications/${recipient.communicationId}`)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                        {recipient.communication?.title ?? recipient.communicationId.slice(0, 8) + '…'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[recipient.status]}>
                          {COMMUNICATION_RECIPIENT_STATUS_LABELS[recipient.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(recipient.createdAt).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/communications/${recipient.communicationId}`);
                          }}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="md:hidden space-y-3">
            {recipients.map((recipient) => (
              <div
                key={recipient.id}
                className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 cursor-pointer hover:bg-gray-50 transition-colors ${recipient.status === 'DELIVERED' ? 'border-l-4 border-blue-400' : ''}`}
                onClick={() => navigate(`/communications/${recipient.communicationId}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/communications/${recipient.communicationId}`);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-lg truncate">
                      {recipient.communication?.title ?? recipient.communicationId.slice(0, 8) + '…'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(recipient.createdAt).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <Badge variant={STATUS_BADGE_VARIANT[recipient.status]}>
                    {COMMUNICATION_RECIPIENT_STATUS_LABELS[recipient.status]}
                  </Badge>
                </div>
              </div>
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
