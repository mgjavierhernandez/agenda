import { useParams, useNavigate } from 'react-router-dom';
import { useNotification, useMarkNotificationRead, useDeleteNotification } from '../hooks';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import type { NotificationStatus, NotificationType } from '@/api/types';

const STATUS_LABELS: Record<NotificationStatus, string> = {
  UNREAD: 'No leído',
  READ: 'Leído',
};

const TYPE_LABELS: Record<NotificationType, string> = {
  SIGNATURE_REQUEST: 'Solicitud de firma',
  SIGNATURE_COMPLETED: 'Firma completada',
  SIGNATURE_DECLINED: 'Firma rechazada',
  COMMUNICATION: 'Comunicación',
  TASK_UPDATE: 'Actualización de tarea',
  GENERAL: 'General',
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

export function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: notification, isLoading, error } = useNotification(id ?? '');
  const markReadMutation = useMarkNotificationRead();
  const deleteMutation = useDeleteNotification();

  const handleMarkAsRead = () => {
    if (id) markReadMutation.mutate(id);
  };

  const handleDelete = () => {
    if (id) {
      deleteMutation.mutate(id, {
        onSuccess: () => navigate('/notifications'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  if (!notification) {
    return <ErrorState error={{ statusCode: 404, message: 'Notificación no encontrada', timestamp: '', path: '' }} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={notification.title}
        description={`${TYPE_LABELS[notification.type]}`}
        actions={
          <div className="flex gap-2">
            {notification.status === 'UNREAD' && (
              <Button
                variant="secondary"
                onClick={handleMarkAsRead}
                isLoading={markReadMutation.isPending}
              >
                Marcar como leído
              </Button>
            )}
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
            >
              Eliminar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contenido</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Título</dt>
              <dd className="text-gray-900">{notification.title}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Mensaje</dt>
              <dd className="text-gray-900 whitespace-pre-wrap">{notification.message}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Tipo</dt>
              <dd className="flex items-center gap-2">
                <span>{TYPE_ICONS[notification.type]}</span>
                <span className="text-gray-900">{TYPE_LABELS[notification.type]}</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={STATUS_BADGE_VARIANT[notification.status]}>
                  {STATUS_LABELS[notification.status]}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadatos</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">ID</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{notification.id}</dd>
            </div>
            {notification.entityType && (
              <div>
                <dt className="text-sm text-gray-500">Entidad relacionada</dt>
                <dd className="text-gray-900">{notification.entityType}{notification.entityId ? ` (${notification.entityId})` : ''}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Fecha de creación</dt>
              <dd className="text-gray-900">
                {new Date(notification.createdAt).toLocaleString('es-CO')}
              </dd>
            </div>
            {notification.readAt && (
              <div>
                <dt className="text-sm text-gray-500">Leído el</dt>
                <dd className="text-gray-900">
                  {new Date(notification.readAt).toLocaleString('es-CO')}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Última actualización</dt>
              <dd className="text-gray-900">
                {new Date(notification.updatedAt).toLocaleString('es-CO')}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/notifications')}>
          Volver a notificaciones
        </Button>
      </div>
    </div>
  );
}
