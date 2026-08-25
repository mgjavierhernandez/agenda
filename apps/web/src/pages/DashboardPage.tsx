import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/auth.store';
import { useTenant } from '@/tenant/tenant.store';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/feedback/PageHeader';
import { useDashboardStats, useRecentTasks, useRecentNotifications, usePendingSignatures } from '@/modules/dashboard/hooks';
import { useUnreadCommunicationsCount } from '@/modules/communication-recipients/hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PERMISSIONS } from '@/permissions/permission.constants';
import {
  TASK_STATUS_LABELS,
  SIGNATURE_REQUEST_STATUS_LABELS,
} from '@/api/types';
import type { Task, SignatureRequest, Notification } from '@/api/types';

const TASK_BADGE: Record<string, 'warning' | 'success' | 'default' | 'info'> = {
  DRAFT: 'default',
  PUBLISHED: 'info',
  CLOSED: 'success',
};

const SIGNATURE_BADGE: Record<string, 'warning' | 'success' | 'default' | 'info'> = {
  DRAFT: 'default',
  PUBLISHED: 'warning',
  COMPLETED: 'success',
  EXPIRED: 'default',
  INACTIVE: 'default',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function TaskItem({ task }: { task: Task }) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {task.dueDate ? `Vence: ${formatDate(task.dueDate)}` : 'Sin fecha límite'}
        </p>
      </div>
      <Badge variant={TASK_BADGE[task.status] ?? 'default'} className="ml-2 shrink-0">
        {TASK_STATUS_LABELS[task.status]}
      </Badge>
    </Link>
  );
}

function NotificationItem({ notification }: { notification: Notification }) {
  return (
    <Link
      to="/notifications"
      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{notification.message}</p>
      </div>
      <Badge variant={notification.status === 'UNREAD' ? 'warning' : 'default'} className="ml-2 shrink-0">
        {notification.status === 'UNREAD' ? 'No leída' : 'Leída'}
      </Badge>
    </Link>
  );
}

function SignatureItem({ signature }: { signature: SignatureRequest }) {
  return (
    <Link
      to={`/signatures/${signature.id}`}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{signature.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {signature.dueDate ? `Vence: ${formatDate(signature.dueDate)}` : 'Sin fecha límite'}
        </p>
      </div>
      <Badge variant={SIGNATURE_BADGE[signature.status] ?? 'default'} className="ml-2 shrink-0">
        {SIGNATURE_REQUEST_STATUS_LABELS[signature.status]}
      </Badge>
    </Link>
  );
}

interface SectionProps {
  title: string;
  action?: { label: string; to: string };
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

function DashboardSection({ title, action, isLoading, isEmpty, emptyMessage, children }: SectionProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {action && (
          <Link to={action.to} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            {action.label}
          </Link>
        )}
      </div>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : isEmpty ? (
        <p className="text-sm text-gray-500 py-4 text-center">{emptyMessage ?? 'Sin elementos'}</p>
      ) : (
        <div className="divide-y divide-gray-100">{children}</div>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { selectedInstitution, isTenantReady } = useTenant();
  const { hasPermission } = usePermissions();

  const { stats, isLoading: statsLoading } = useDashboardStats(isTenantReady);
  const { data: tasksData, isLoading: tasksLoading } = useRecentTasks(isTenantReady);
  const { data: notifData, isLoading: notifsLoading } = useRecentNotifications(isTenantReady);
  const { data: sigData, isLoading: sigsLoading } = usePendingSignatures(isTenantReady);
  const { data: unreadData } = useUnreadCommunicationsCount();

  const unreadComms = unreadData?.count ?? 0;
  const recentTasks = tasksData?.data ?? [];
  const recentNotifications = notifData?.data ?? [];
  const pendingSignatures = sigData?.data ?? [];

  const greeting = user?.email?.split('@')[0] || 'Usuario';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bienvenido, ${greeting}`}
        description={selectedInstitution?.name ?? undefined}
      />

      {statsLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Estudiantes"
            value={stats.students}
            icon={<span className="text-2xl">👨‍🎓</span>}
            description="Estudiantes registrados"
          />
          <StatCard
            title="Cursos"
            value={stats.courses}
            icon={<span className="text-2xl">📚</span>}
            description="Cursos activos"
          />
          <StatCard
            title="Asignaturas"
            value={stats.subjects}
            icon={<span className="text-2xl">📝</span>}
            description="Asignaturas registradas"
          />
          <StatCard
            title="Tareas"
            value={stats.tasks}
            icon={<span className="text-2xl">✅</span>}
            description="Tareas creadas"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Matrículas"
          value={stats.enrollments}
          icon={<span className="text-2xl">📋</span>}
          description="Matrículas activas"
        />
        <StatCard
          title="Comunicaciones"
          value={stats.communications}
          icon={<span className="text-2xl">📢</span>}
          description="Comunicaciones publicadas"
        />
        <StatCard
          title="Firmas"
          value={stats.signatures}
          icon={<span className="text-2xl">✍️</span>}
          description="Solicitudes de firma"
        />
        <StatCard
          title="Notificaciones sin leer"
          value={unreadComms}
          icon={<span className="text-2xl">🔔</span>}
          description="Notificaciones pendientes"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardSection
          title="Tareas recientes"
          action={hasPermission(PERMISSIONS.TASKS_READ) ? { label: 'Ver todas', to: '/tasks' } : undefined}
          isLoading={tasksLoading}
          isEmpty={recentTasks.length === 0}
          emptyMessage="No hay tareas recientes"
        >
          {recentTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </DashboardSection>

        <DashboardSection
          title="Notificaciones recientes"
          action={hasPermission(PERMISSIONS.NOTIFICATIONS_READ) ? { label: 'Ver todas', to: '/notifications' } : undefined}
          isLoading={notifsLoading}
          isEmpty={recentNotifications.length === 0}
          emptyMessage="No hay notificaciones recientes"
        >
          {recentNotifications.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </DashboardSection>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardSection
          title="Firmas pendientes"
          action={hasPermission(PERMISSIONS.SIGNATURES_READ) ? { label: 'Ver todas', to: '/signatures' } : undefined}
          isLoading={sigsLoading}
          isEmpty={pendingSignatures.length === 0}
          emptyMessage="No hay firmas pendientes"
        >
          {pendingSignatures.map((sig) => (
            <SignatureItem key={sig.id} signature={sig} />
          ))}
        </DashboardSection>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Accesos rápidos</h3>
          <div className="grid grid-cols-2 gap-2">
            {hasPermission(PERMISSIONS.STUDENTS_READ) && (
              <Link to="/students" className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
                <span>👨‍🎓</span> Estudiantes
              </Link>
            )}
            {hasPermission(PERMISSIONS.COURSES_READ) && (
              <Link to="/courses" className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
                <span>📚</span> Cursos
              </Link>
            )}
            {hasPermission(PERMISSIONS.TASKS_READ) && (
              <Link to="/tasks" className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
                <span>✅</span> Tareas
              </Link>
            )}
            {hasPermission(PERMISSIONS.COMMUNICATIONS_READ) && (
              <Link to="/communication-inbox" className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
                <span>📥</span> Bandeja
                {unreadComms > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                    {unreadComms > 99 ? '99+' : unreadComms}
                  </span>
                )}
              </Link>
            )}
            {hasPermission(PERMISSIONS.SIGNATURES_READ) && (
              <Link to="/signatures" className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
                <span>✍️</span> Firmas
              </Link>
            )}
            {hasPermission(PERMISSIONS.GRADES_READ) && (
              <Link to="/grades" className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
                <span>📈</span> Notas
              </Link>
            )}
            {hasPermission(PERMISSIONS.ENROLLMENTS_READ) && (
              <Link to="/enrollments" className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
                <span>📋</span> Matrículas
              </Link>
            )}
            {hasPermission(PERMISSIONS.NOTIFICATIONS_READ) && (
              <Link to="/notifications" className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
                <span>🔔</span> Notificaciones
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
