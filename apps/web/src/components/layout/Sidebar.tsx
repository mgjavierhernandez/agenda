import { NavLink } from 'react-router-dom';
import { usePermissions } from '@/permissions/usePermissions';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { useUnreadCommunicationsCount } from '@/modules/communication-recipients/hooks';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  permission?: string;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/agenda', label: 'Agenda', icon: '📅', permission: PERMISSIONS.AGENDA_READ },
  { to: '/students', label: 'Estudiantes', icon: '👨‍🎓', permission: PERMISSIONS.STUDENTS_READ },
  { to: '/courses', label: 'Cursos', icon: '📚', permission: PERMISSIONS.COURSES_READ },
  { to: '/subjects', label: 'Asignaturas', icon: '📝', permission: PERMISSIONS.SUBJECTS_READ },
  { to: '/grades', label: 'Notas', icon: '📈', permission: PERMISSIONS.GRADES_READ },
  { to: '/schedules', label: 'Horarios', icon: '📅', permission: PERMISSIONS.SCHEDULES_READ },
  { to: '/tasks', label: 'Tareas', icon: '✅', permission: PERMISSIONS.TASKS_READ },
  { to: '/task-assignments', label: 'Asignaciones', icon: '📋', permission: PERMISSIONS.TASKS_READ },
  { to: '/task-submissions', label: 'Entregas', icon: '📤', permission: PERMISSIONS.TASKS_READ },
  { to: '/communications', label: 'Comunicaciones', icon: '📢', permission: PERMISSIONS.COMMUNICATIONS_READ },
  { to: '/communication-inbox', label: 'Bandeja de entrada', icon: '📥', permission: PERMISSIONS.COMMUNICATIONS_READ },
  { to: '/signatures', label: 'Firmas', icon: '✍️', permission: PERMISSIONS.SIGNATURES_READ },
  { to: '/notifications', label: 'Notificaciones', icon: '🔔', permission: PERMISSIONS.NOTIFICATIONS_READ },
  { to: '/academic-periods', label: 'Periodos académicos', icon: '🗓️', permission: PERMISSIONS.ACADEMIC_PERIODS_READ },
  { to: '/school-grades', label: 'Grados académicos', icon: '🎓', permission: PERMISSIONS.SCHOOL_GRADES_READ },
  { to: '/guardians', label: 'Acudientes', icon: '👨‍👩‍👧', permission: PERMISSIONS.GUARDIANS_READ },
  { to: '/enrollments', label: 'Matrículas', icon: '📋', permission: PERMISSIONS.ENROLLMENTS_READ },
  { to: '/teacher-assignments', label: 'Asignaciones docentes', icon: '👨‍🏫', permission: PERMISSIONS.TEACHER_ASSIGNMENTS_READ },
  { to: '/student-follow-ups', label: 'Observador', icon: '📋', permission: PERMISSIONS.STUDENT_FOLLOW_UPS_READ },
  { to: '/student-follow-ups/categories', label: 'Categorías', icon: '🏷️', permission: PERMISSIONS.STUDENT_FOLLOW_UPS_CATEGORIES },
  { to: '/attendance', label: 'Asistencia', icon: '✅', permission: PERMISSIONS.ATTENDANCE_READ },
  { to: '/reports', label: 'Reportes y boletín', icon: '📄', permission: PERMISSIONS.REPORTS_READ },
  { to: '/reports/course', label: 'Reporte de curso', icon: '📈', permission: PERMISSIONS.REPORTS_READ },
  { to: '/institution', label: 'Mi institución', icon: '🏫', permission: PERMISSIONS.INSTITUTION_READ },
  { to: '/admin/users', label: 'Usuarios', icon: '👥', permission: PERMISSIONS.USERS_READ },
];

interface SidebarProps {
  isMobile?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ isMobile = false, onNavigate }: SidebarProps) {
  const { hasPermission } = usePermissions();
  const { data: unreadData } = useUnreadCommunicationsCount();
  const unreadCount = unreadData?.count ?? 0;

  const filteredItems = navItems.filter((item) => {
    if (item.permission && !hasPermission(item.permission as never)) return false;
    return true;
  });

  return (
    <nav className={`${isMobile ? 'flex flex-col gap-1' : 'hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200'}`} aria-label="Main navigation">
      <div className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {filteredItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <span className="text-lg" aria-hidden="true">{item.icon}</span>
                {item.label}
                {item.to === '/communication-inbox' && unreadCount > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white" aria-label={`${unreadCount} mensajes sin leer`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
