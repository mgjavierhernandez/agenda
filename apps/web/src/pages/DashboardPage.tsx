import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/auth.store';
import { useTenant } from '@/tenant/tenant.store';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/feedback/PageHeader';
import { useRoleDashboard, type RoleDashboard } from '@/modules/dashboard/hooks';
import { AcademicDashboard } from '@/modules/dashboard/components/AcademicDashboard';
import { useParentStudentFilter } from '@/modules/children';
import { useUnreadCommunicationsCount } from '@/modules/communication-recipients/hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { useAcademicPeriods } from '@/modules/academic-periods/hooks/useAcademicPeriods';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function StatSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-16 mt-2" />
          <div className="h-2 bg-gray-100 rounded w-32 mt-2" />
        </div>
        <div className="w-11 h-11 rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}

function SectionSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
      <div className="divide-y divide-gray-100">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="py-3">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-2 bg-gray-100 rounded w-1/2 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando panel">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="h-4 bg-gray-100 rounded w-40 mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionSkeleton />
        <SectionSkeleton lines={2} />
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

function SectionHeader({
  title,
  linkTo,
  linkLabel,
}: {
  title: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {linkTo && (
        <Link to={linkTo} className="text-sm font-medium text-blue-600 hover:text-blue-700">
          {linkLabel ?? 'Ver todo'} →
        </Link>
      )}
    </div>
  );
}

function DashboardSection({
  title,
  linkTo,
  linkLabel,
  isEmpty,
  emptyMessage,
  children,
}: SectionProps & { linkTo?: string; linkLabel?: string }) {
  return (
    <Card>
      <SectionHeader title={title} linkTo={linkTo} linkLabel={linkLabel} />
      {isEmpty ? (
        <p className="text-sm text-gray-500 py-4 text-center">{emptyMessage ?? 'Sin elementos'}</p>
      ) : (
        <div className="divide-y divide-gray-100">{children}</div>
      )}
    </Card>
  );
}

function SimpleItem({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="p-3">
      <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
    </div>
  );
}

const FOLLOW_UP_BADGE: Record<string, 'warning' | 'success' | 'default' | 'info' | 'danger'> = {
  OPEN: 'warning',
  IN_PROGRESS: 'info',
  ESCALATED: 'danger',
  PENDING_FOLLOW_UP: 'info',
  RESOLVED: 'success',
  CLOSED: 'default',
};

const COMMITMENT_BADGE: Record<string, 'warning' | 'success' | 'default' | 'info' | 'danger'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'default',
  OVERDUE: 'danger',
};

export function DashboardPage() {
  const { user } = useAuth();
  const { selectedInstitution, isTenantReady } = useTenant();
  const { hasPermission } = usePermissions();
  const [periodFilter, setPeriodFilter] = useState('');
  const { data, isLoading, isError } = useRoleDashboard(isTenantReady, periodFilter || undefined);
  const { data: periodsData } = useAcademicPeriods({ limit: 200 });
  const { data: unreadData } = useUnreadCommunicationsCount();

  const unreadComms = unreadData?.count ?? 0;
  const greeting = user?.email?.split('@')[0] || 'Usuario';
  const { studentId: childStudentId, selectedChild } = useParentStudentFilter();

  if (isLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Bienvenido, ${greeting}`}
          description={selectedInstitution?.name ?? undefined}
        />
        <Card>
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500 mb-4">No se pudo cargar el panel.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const d = data as RoleDashboard;
  const STAFF_ADMIN_ROLES: Array<RoleDashboard['role']> = [
    'INSTITUTION_ADMIN',
    'SUPER_ADMIN',
    'RECTOR',
    'COORDINADOR_ACADEMICO',
    'COORDINADOR_CONVIVENCIA',
    'ORIENTADOR',
    'PSICOLOGO',
  ];
  const isAdmin = STAFF_ADMIN_ROLES.includes(d.role);
  const stats = d.stats ?? {};

  const hasContent =
    !!d.activePeriod ||
    Object.keys(stats).length > 0 ||
    d.children.length > 0 ||
    d.courses.length > 0 ||
    d.subjects.length > 0 ||
    d.upcomingEvents.length > 0 ||
    d.recentCommunications.length > 0 ||
    d.followUps.length > 0 ||
    d.pendingCommitments.length > 0 ||
    d.pendingSignatures.length > 0 ||
    d.recentNotifications.length > 0;

  const periods = periodsData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bienvenido, ${greeting}`}
        description={selectedInstitution?.name ?? undefined}
      />

      {periods.length > 1 && (
        <Card>
          <div className="flex items-center gap-4">
            <label
              htmlFor="dash-period-filter"
              className="text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              Filtrar por periodo:
            </label>
            <select
              id="dash-period-filter"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="flex-1 max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Período activo</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            {periodFilter && (
              <button
                type="button"
                onClick={() => setPeriodFilter('')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Limpiar
              </button>
            )}
          </div>
        </Card>
      )}

      {!hasContent && (
        <Card>
          <p className="text-sm text-gray-500 py-4 text-center">
            No hay información disponible todavía.
          </p>
        </Card>
      )}

      {d.activePeriod && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Período activo</p>
              <p className="text-xs text-gray-500">
                {d.activePeriod.name} ({d.activePeriod.code}) ·{' '}
                {formatDate(d.activePeriod.startDate)} – {formatDate(d.activePeriod.endDate)}
              </p>
            </div>
            <Badge variant="info">{d.activePeriod.status}</Badge>
          </div>
        </Card>
      )}

      {(d.role === 'PARENT' || d.role === 'STUDENT') && (
        <AcademicDashboard
          studentId={d.role === 'PARENT' ? childStudentId : undefined}
          childName={
            d.role === 'PARENT' && selectedChild
              ? `${selectedChild.firstName} ${selectedChild.lastName}`
              : undefined
          }
          unreadCommunications={unreadComms}
          pendingSignatures={d.pendingSignatures.length}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin && (
          <>
            <StatCard
              title="Estudiantes"
              value={stats.students ?? 0}
              icon={<span className="text-2xl">👨‍🎓</span>}
              description="Estudiantes activos"
            />
            <StatCard
              title="Docentes"
              value={stats.teachers ?? 0}
              icon={<span className="text-2xl">🧑‍🏫</span>}
              description="Docentes en la institución"
            />
            <StatCard
              title="Cursos"
              value={stats.courses ?? 0}
              icon={<span className="text-2xl">📚</span>}
              description="Cursos activos"
            />
            <StatCard
              title="Asignaturas"
              value={stats.subjects ?? 0}
              icon={<span className="text-2xl">📝</span>}
              description="Asignaturas registradas"
            />
            <StatCard
              title="Seguimientos pendientes"
              value={stats.pendingFollowUps ?? 0}
              icon={<span className="text-2xl">📋</span>}
              description="Seguimientos abiertos"
            />
          </>
        )}
        {(d.role === 'TEACHER' || d.role === 'DIRECTOR_DE_GRUPO') && (
          <>
            <StatCard
              title="Cursos"
              value={stats.courses ?? 0}
              icon={<span className="text-2xl">📚</span>}
              description="Cursos asignados"
            />
            <StatCard
              title="Estudiantes"
              value={stats.students ?? 0}
              icon={<span className="text-2xl">👨‍🎓</span>}
              description="Estudiantes en tus cursos"
            />
            <StatCard
              title="Asignaturas"
              value={d.subjects.length}
              icon={<span className="text-2xl">📝</span>}
              description="Asignaturas asignadas"
            />
          </>
        )}
        {d.role === 'PARENT' && (
          <StatCard
            title="Hijos"
            value={stats.children ?? 0}
            icon={<span className="text-2xl">👨‍👩‍👧</span>}
            description="Estudiantes a tu cargo"
          />
        )}
        {d.role === 'STUDENT' && (
          <>
            <StatCard
              title="Matrículas"
              value={stats.enrollments ?? 0}
              icon={<span className="text-2xl">📋</span>}
              description="Cursos matriculados"
            />
            <StatCard
              title="Seguimientos"
              value={stats.followUps ?? 0}
              icon={<span className="text-2xl">📋</span>}
              description="Seguimientos tuyos"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {d.children.length > 0 && (
          <DashboardSection title="Mis hijos">
            {d.children.map((c) => (
              <Link key={c.id} to={`/students/${c.id}`} className="block hover:bg-gray-50">
                <SimpleItem title={`${c.firstName} ${c.lastName}`} />
              </Link>
            ))}
          </DashboardSection>
        )}

        {d.courses.length > 0 && (
          <DashboardSection title="Cursos">
            {d.courses.map((c) => (
              <SimpleItem key={c.id} title={`${c.name} (${c.code})`} />
            ))}
          </DashboardSection>
        )}

        {d.subjects.length > 0 && (
          <DashboardSection title="Asignaturas">
            {d.subjects.map((s) => (
              <SimpleItem key={s.id} title={`${s.name} (${s.code})`} />
            ))}
          </DashboardSection>
        )}

        {d.upcomingEvents.length > 0 && (
          <DashboardSection title="Próximos eventos" linkTo="/agenda" linkLabel="Ver agenda">
            {d.upcomingEvents.map((e) => (
              <SimpleItem
                key={e.id}
                title={e.title}
                subtitle={`${formatDate(e.startAt)}${e.location ? ` · ${e.location}` : ''}`}
              />
            ))}
          </DashboardSection>
        )}

        {d.recentCommunications.length > 0 && (
          <DashboardSection
            title="Comunicaciones recientes"
            linkTo="/communication-inbox"
            linkLabel="Bandeja"
          >
            {d.recentCommunications.map((c) => (
              <SimpleItem key={c.id} title={c.title} subtitle={formatDate(c.publishedAt)} />
            ))}
          </DashboardSection>
        )}

        {d.followUps.length > 0 && (
          <DashboardSection
            title="Seguimientos recientes"
            linkTo="/student-follow-ups"
            linkLabel="Ver seguimientos"
          >
            {d.followUps.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3">
                <SimpleItem title={f.title} />
                <Badge variant={FOLLOW_UP_BADGE[f.status] ?? 'default'} className="ml-2 shrink-0">
                  {f.status}
                </Badge>
              </div>
            ))}
          </DashboardSection>
        )}

        {d.pendingCommitments.length > 0 && (
          <DashboardSection
            title="Compromisos pendientes"
            linkTo="/student-follow-ups"
            linkLabel="Ver seguimientos"
          >
            {d.pendingCommitments.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3">
                <SimpleItem title={c.description} />
                <Badge variant={COMMITMENT_BADGE[c.status] ?? 'default'} className="ml-2 shrink-0">
                  {c.status}
                </Badge>
              </div>
            ))}
          </DashboardSection>
        )}

        {d.pendingSignatures.length > 0 && (
          <DashboardSection
            title="Firmas pendientes de ti"
            linkTo="/signatures"
            linkLabel="Ver firmas"
          >
            {d.pendingSignatures.map((s) => (
              <Link key={s.id} to={`/signatures/${s.id}`} className="block hover:bg-gray-50">
                <SimpleItem
                  title={s.title}
                  subtitle={s.dueDate ? `Vence: ${formatDate(s.dueDate)}` : undefined}
                />
              </Link>
            ))}
          </DashboardSection>
        )}

        {d.recentNotifications.length > 0 && (
          <DashboardSection
            title="Notificaciones recientes"
            linkTo="/notifications"
            linkLabel="Ver notificaciones"
          >
            {d.recentNotifications.map((n) => (
              <div key={n.id} className="flex items-center justify-between p-3">
                <SimpleItem title={n.title} subtitle={n.message} />
                <Badge
                  variant={n.status === 'UNREAD' ? 'warning' : 'default'}
                  className="ml-2 shrink-0"
                >
                  {n.status === 'UNREAD' ? 'No leída' : 'Leída'}
                </Badge>
              </div>
            ))}
          </DashboardSection>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Accesos rápidos</h3>
          <div className="grid grid-cols-2 gap-2">
            {hasPermission(PERMISSIONS.STUDENTS_READ) && (
              <Link
                to="/students"
                aria-label="Ir a Estudiantes"
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                <span>👨‍🎓</span> Estudiantes
              </Link>
            )}
            {hasPermission(PERMISSIONS.COURSES_READ) && (
              <Link
                to="/courses"
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                <span>📚</span> Cursos
              </Link>
            )}
            {hasPermission(PERMISSIONS.TASKS_READ) && (
              <Link
                to="/tasks"
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                <span>✅</span> Tareas
              </Link>
            )}
            {hasPermission(PERMISSIONS.COMMUNICATIONS_READ) && (
              <Link
                to="/communication-inbox"
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                <span>📥</span> Bandeja
                {unreadComms > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                    {unreadComms > 99 ? '99+' : unreadComms}
                  </span>
                )}
              </Link>
            )}
            {hasPermission(PERMISSIONS.SIGNATURES_READ) && (
              <Link
                to="/signatures"
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                <span>✍️</span> Firmas
              </Link>
            )}
            {hasPermission(PERMISSIONS.GRADES_READ) && (
              <Link
                to="/grades"
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                <span>📈</span> Notas
              </Link>
            )}
            {hasPermission(PERMISSIONS.ENROLLMENTS_READ) && (
              <Link
                to="/enrollments"
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                <span>📋</span> Matrículas
              </Link>
            )}
            {hasPermission(PERMISSIONS.NOTIFICATIONS_READ) && (
              <Link
                to="/notifications"
                className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                <span>🔔</span> Notificaciones
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
