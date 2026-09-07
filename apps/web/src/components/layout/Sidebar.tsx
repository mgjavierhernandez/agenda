import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { usePermissions } from '@/permissions/usePermissions';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { useUnreadCommunicationsCount } from '@/modules/communication-recipients/hooks';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  permission?: string;
}

export interface NavCategory {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
}

const STORAGE_KEY = 'agenda-sidebar-expanded';

export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'inicio',
    label: 'Inicio',
    icon: '🏠',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊' },
      { to: '/agenda', label: 'Agenda', icon: '📅', permission: PERMISSIONS.AGENDA_READ },
    ],
  },
  {
    id: 'gestion-academica',
    label: 'Gestión académica',
    icon: '🎓',
    items: [
      { to: '/students', label: 'Estudiantes', icon: '👨‍🎓', permission: PERMISSIONS.STUDENTS_READ },
      { to: '/students/import', label: 'Importar estudiantes', icon: '📥', permission: PERMISSIONS.STUDENTS_MANAGE },
      { to: '/enrollments', label: 'Matrículas', icon: '📋', permission: PERMISSIONS.ENROLLMENTS_READ },
      { to: '/courses', label: 'Cursos', icon: '📚', permission: PERMISSIONS.COURSES_READ },
      { to: '/subjects', label: 'Asignaturas', icon: '📝', permission: PERMISSIONS.SUBJECTS_READ },
      { to: '/areas', label: 'Áreas', icon: '🗂️', permission: PERMISSIONS.AREAS_READ },
      { to: '/school-grades', label: 'Grados académicos', icon: '🎓', permission: PERMISSIONS.SCHOOL_GRADES_READ },
      { to: '/academic-periods', label: 'Periodos académicos', icon: '🗓️', permission: PERMISSIONS.ACADEMIC_PERIODS_READ },
    ],
  },
  {
    id: 'gestion-docente',
    label: 'Gestión docente',
    icon: '🧑‍🏫',
    items: [
      { to: '/teachers', label: 'Docentes', icon: '🧑‍🏫', permission: PERMISSIONS.TEACHER_ASSIGNMENTS_READ },
      { to: '/teacher-assignments', label: 'Asignaciones docentes', icon: '👨‍🏫', permission: PERMISSIONS.TEACHER_ASSIGNMENTS_READ },
      { to: '/course-directors', label: 'Directores de grupo', icon: '🧑‍🏫', permission: PERMISSIONS.TEACHER_ASSIGNMENTS_READ },
    ],
  },
  {
    id: 'evaluacion',
    label: 'Evaluación',
    icon: '📈',
    items: [
      { to: '/grades', label: 'Notas', icon: '📈', permission: PERMISSIONS.GRADES_READ },
      { to: '/attendance', label: 'Asistencia', icon: '✅', permission: PERMISSIONS.ATTENDANCE_READ },
      { to: '/reports', label: 'Reportes y boletín', icon: '📄', permission: PERMISSIONS.REPORTS_READ },
      { to: '/reports/course', label: 'Reporte de curso', icon: '📈', permission: PERMISSIONS.REPORTS_READ },
    ],
  },
  {
    id: 'horarios',
    label: 'Horarios',
    icon: '🕒',
    items: [
      { to: '/schedules', label: 'Horarios', icon: '📅', permission: PERMISSIONS.SCHEDULES_READ },
      { to: '/schedules/blocks', label: 'Franjas horarias', icon: '⏰', permission: PERMISSIONS.SCHEDULES_READ },
      { to: '/schedules/classrooms', label: 'Aulas', icon: '🏫', permission: PERMISSIONS.SCHEDULES_READ },
    ],
  },
  {
    id: 'trabajo-academico',
    label: 'Trabajo académico',
    icon: '📚',
    items: [
      { to: '/tasks', label: 'Tareas', icon: '✅', permission: PERMISSIONS.TASKS_READ },
      { to: '/task-assignments', label: 'Asignaciones', icon: '📋', permission: PERMISSIONS.TASKS_READ },
      { to: '/task-submissions', label: 'Entregas', icon: '📤', permission: PERMISSIONS.TASKS_READ },
    ],
  },
  {
    id: 'comunicacion',
    label: 'Comunicación',
    icon: '📢',
    items: [
      { to: '/communications', label: 'Comunicaciones', icon: '📢', permission: PERMISSIONS.COMMUNICATIONS_READ },
      { to: '/communication-inbox', label: 'Bandeja de entrada', icon: '📥', permission: PERMISSIONS.COMMUNICATIONS_READ },
      { to: '/signatures', label: 'Firmas', icon: '✍️', permission: PERMISSIONS.SIGNATURES_READ },
      { to: '/notifications', label: 'Notificaciones', icon: '🔔', permission: PERMISSIONS.NOTIFICATIONS_READ },
    ],
  },
  {
    id: 'convivencia',
    label: 'Convivencia',
    icon: '🤝',
    items: [
      { to: '/student-follow-ups', label: 'Observador', icon: '📋', permission: PERMISSIONS.STUDENT_FOLLOW_UPS_READ },
      { to: '/student-follow-ups/categories', label: 'Categorías', icon: '🏷️', permission: PERMISSIONS.STUDENT_FOLLOW_UPS_CATEGORIES },
    ],
  },
  {
    id: 'comunidad',
    label: 'Comunidad',
    icon: '👨‍👩‍👧',
    items: [
      { to: '/guardians', label: 'Acudientes', icon: '👨‍👩‍👧', permission: PERMISSIONS.GUARDIANS_READ },
    ],
  },
  {
    id: 'administracion',
    label: 'Administración',
    icon: '⚙️',
    items: [
      { to: '/profile', label: 'Mi perfil', icon: '👤' },
      { to: '/institution', label: 'Mi institución', icon: '🏫', permission: PERMISSIONS.INSTITUTION_READ },
      { to: '/admin/users', label: 'Usuarios', icon: '👥', permission: PERMISSIONS.USERS_READ },
      { to: '/admin/requests', label: 'Solicitudes de acceso', icon: '📨', permission: PERMISSIONS.MEMBERSHIPS_MANAGE },
    ],
  },
];

function loadExpanded(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    // ignorar: usar valores por defecto
  }
  return {};
}

function isPathActive(itemTo: string, pathname: string): boolean {
  if (itemTo === '/dashboard') return pathname === '/dashboard' || pathname === '/';
  // Las rutas hijas (detalle/form) deben mantener la categoria padre expandida y resaltada
  return pathname === itemTo || pathname.startsWith(`${itemTo}/`);
}

interface SidebarProps {
  isMobile?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ isMobile = false, onNavigate }: SidebarProps) {
  const { hasPermission } = usePermissions();
  const { data: unreadData } = useUnreadCommunicationsCount();
  const unreadCount = unreadData?.count ?? 0;
  const location = useLocation();

  const visibleCategories = useMemo(
    () =>
      NAV_CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => {
          if (item.permission && !hasPermission(item.permission as never)) return false;
          return true;
        }),
      })).filter((cat) => cat.items.length > 0),
    [hasPermission],
  );

  const activeCategoryId = useMemo(() => {
    for (const cat of visibleCategories) {
      if (cat.items.some((item) => isPathActive(item.to, location.pathname))) return cat.id;
    }
    return null;
  }, [visibleCategories, location.pathname]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(loadExpanded);

  // Auto-expandir la categoria activa al navegar (sin cerrar las que el usuario abrio manualmente)
  useEffect(() => {
    if (activeCategoryId) {
      setExpanded((prev) => {
        if (prev[activeCategoryId]) return prev;
        const next = { ...prev, [activeCategoryId]: true };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // almacenamiento no disponible: no bloquear navegacion
        }
        return next;
      });
    }
  }, [activeCategoryId]);

  const toggleCategory = (id: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignorar
      }
      return next;
    });
  };

  const isExpanded = (id: string) => {
    if (id in expanded) return expanded[id];
    // Por defecto: categoria activa expandida, resto colapsadas para no alargar el menu
    return id === activeCategoryId;
  };

  return (
    <nav className={`${isMobile ? 'flex flex-col gap-1' : 'hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200'}`} aria-label="Main navigation">
      <div className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {visibleCategories.map((cat) => {
            const open = isExpanded(cat.id);
            const containsActive = cat.items.some((item) => isPathActive(item.to, location.pathname));
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  aria-expanded={open}
                  aria-label={`Categoría ${cat.label}`}
                  className={`flex w-full items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors ${
                    containsActive ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="text-base" aria-hidden="true">{cat.icon}</span>
                  <span className="flex-1 text-left">{cat.label}</span>
                  <span
                    className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                  >
                    ▶
                  </span>
                </button>
                {open && (
                  <ul className="mt-1 ml-2 space-y-1 border-l border-gray-200 pl-2">
                    {cat.items.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              isActive || isPathActive(item.to, location.pathname)
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
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
