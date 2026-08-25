import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '../hooks';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import type { NotificationStatus, NotificationType } from '@/api/types';

const STATUS_LABELS: Record<NotificationStatus, string> = {
  UNREAD: 'No leído',
  READ: 'Leído',
};

const STATUS_BADGE_VARIANT: Record<NotificationStatus, 'warning' | 'default'> = {
  UNREAD: 'warning',
  READ: 'default',
};

const TYPE_ICONS: Record<NotificationType, string> = {
  SIGNATURE_REQUEST: '✍️',
  SIGNATURE_COMPLETED: '✅',
  SIGNATURE_DECLINED: '❌',
  COMMUNICATION: '📢',
  TASK_UPDATE: '📋',
  GENERAL: '🔔',
};

export function NotificationsPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('');
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = useNotifications({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: (statusFilter as NotificationStatus) || undefined,
    type: (typeFilter as NotificationType) || undefined,
  });

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  const notifications = data?.data ?? [];
  const meta = data?.meta;
  const unreadCount = data?.unreadCount ?? 0;

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setPage(1);
  }, []);

  const handleMarkAsRead = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      markReadMutation.mutate(id);
    },
    [markReadMutation],
  );

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificaciones"
        description={`${unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}`}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="secondary"
              onClick={() => markAllReadMutation.mutate()}
              isLoading={markAllReadMutation.isPending}
            >
              Marcar todo como leído
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Buscar por título o mensaje..."
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
              setStatusFilter(e.target.value as NotificationStatus | '');
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="UNREAD">No leído</option>
            <option value="READ">Leído</option>
          </select>
        </div>
        <div className="w-full sm:w-44">
          <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <select
            id="typeFilter"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as NotificationType | '');
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="SIGNATURE_REQUEST">Solicitud de firma</option>
            <option value="SIGNATURE_COMPLETED">Firma completada</option>
            <option value="SIGNATURE_DECLINED">Firma rechazada</option>
            <option value="COMMUNICATION">Comunicación</option>
            <option value="TASK_UPDATE">Actualización de tarea</option>
            <option value="GENERAL">General</option>
          </select>
        </div>
        {(debouncedSearch || statusFilter || typeFilter) && (
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
      ) : notifications.length === 0 ? (
        <EmptyState
          title={debouncedSearch || statusFilter || typeFilter ? 'No se encontraron notificaciones' : 'No hay notificaciones'}
          description={
            debouncedSearch || statusFilter || typeFilter
              ? 'No encontramos notificaciones que coincidan con los filtros aplicados.'
              : 'Las notificaciones aparecerán aquí cuando las recibas.'
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Card padding="none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Título</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Mensaje</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((notif) => (
                    <tr
                      key={notif.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${notif.status === 'UNREAD' ? 'bg-blue-50/40' : ''}`}
                      onClick={() => navigate(`/notifications/${notif.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-lg">{TYPE_ICONS[notif.type]}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={notif.title}>
                        {notif.title}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[300px] truncate" title={notif.message}>
                        {notif.message}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[notif.status]}>
                          {STATUS_LABELS[notif.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(notif.createdAt).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {notif.status === 'UNREAD' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleMarkAsRead(notif.id, e)}
                              isLoading={markReadMutation.isPending}
                            >
                              Marcar leído
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDelete(notif.id, e)}
                            isLoading={deleteMutation.isPending}
                          >
                            Eliminar
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
            {notifications.map((notif) => (
              <div key={notif.id} onClick={() => navigate(`/notifications/${notif.id}`)} className="cursor-pointer">
                <Card>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-lg mt-0.5">{TYPE_ICONS[notif.type]}</span>
                      <div className="space-y-1 min-w-0">
                        <p className={`font-semibold text-gray-900 text-lg truncate ${notif.status === 'UNREAD' ? 'text-blue-900' : ''}`}>
                          {notif.title}
                        </p>
                        <p className="text-sm text-gray-500 truncate max-w-[250px]">
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(notif.createdAt).toLocaleString('es-CO')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={STATUS_BADGE_VARIANT[notif.status]}>
                      {STATUS_LABELS[notif.status]}
                    </Badge>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    {notif.status === 'UNREAD' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                      >
                        Marcar leído
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(notif.id, e)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </Card>
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
