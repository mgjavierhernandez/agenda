import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { usePermissions } from '@/permissions/usePermissions';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { useUnreadCommunicationsCount } from '@/modules/communication-recipients/hooks';

export interface NavItem {
  to: string;
  label: string;
  permission?: string;
}

export interface NavCategory {
  id: string;
  label: string;
  items: NavItem[];
}

const STORAGE_KEY = 'agenda-sidebar-expanded';

// Menú sin iconos (decisión de producto): texto, jerarquía y estados.
// "Franjas horarias" y "Aulas" son administración de horarios: requieren
// SCHEDULES_MANAGE para no aparecer a PARENT/STUDENT ni a docentes sin gestión.
export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'inicio',
    label: 'Inicio',
    items: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/agenda', label: 'Agenda', permission: PERMISSIONS.AGENDA_READ },
      { to: '/profile', label: 'Mi perfil' },
    ],
  },
  {
    id: 'gestion-academica',
    label: 'Gestión académica',
    items: [
      { to: '/students', label: 'Estudiantes', permission: PERMISSIONS.STUDENTS_READ },
      {
        to: '/students/import',
        label: 'Importar estudiantes',
        permission: PERMISSIONS.STUDENTS_MANAGE,
      },
      { to: '/enrollments', label: 'Matrículas', permission: PERMISSIONS.ENROLLMENTS_READ },
      { to: '/courses', label: 'Cursos', permission: PERMISSIONS.COURSES_READ },
      { to: '/subjects', label: 'Asignaturas', permission: PERMISSIONS.SUBJECTS_READ },
      { to: '/areas', label: 'Áreas', permission: PERMISSIONS.AREAS_READ },
      {
        to: '/school-grades',
        label: 'Grados académicos',
        permission: PERMISSIONS.SCHOOL_GRADES_READ,
      },
      {
        to: '/academic-periods',
        label: 'Periodos académicos',
        permission: PERMISSIONS.ACADEMIC_PERIODS_READ,
      },
    ],
  },
  {
    id: 'gestion-docente',
    label: 'Gestión docente',
    items: [
      { to: '/teachers', label: 'Docentes', permission: PERMISSIONS.TEACHER_ASSIGNMENTS_READ },
      {
        to: '/teacher-assignments',
        label: 'Asignaciones docentes',
        permission: PERMISSIONS.TEACHER_ASSIGNMENTS_READ,
      },
      {
        to: '/course-directors',
        label: 'Directores de grupo',
        permission: PERMISSIONS.TEACHER_ASSIGNMENTS_READ,
      },
    ],
  },
  {
    id: 'evaluacion',
    label: 'Evaluación',
    items: [
      { to: '/grades', label: 'Notas', permission: PERMISSIONS.GRADES_READ },
      { to: '/attendance', label: 'Asistencia', permission: PERMISSIONS.ATTENDANCE_READ },
      { to: '/reports', label: 'Reportes y boletín', permission: PERMISSIONS.REPORTS_READ },
      { to: '/reports/course', label: 'Reporte de curso', permission: PERMISSIONS.REPORTS_READ },
    ],
  },
  {
    id: 'horarios',
    label: 'Horarios',
    items: [
      { to: '/schedules', label: 'Horarios', permission: PERMISSIONS.SCHEDULES_READ },
      {
        to: '/schedules/blocks',
        label: 'Franjas horarias',
        permission: PERMISSIONS.SCHEDULES_MANAGE,
      },
      { to: '/schedules/classrooms', label: 'Aulas', permission: PERMISSIONS.SCHEDULES_MANAGE },
    ],
  },
  {
    id: 'trabajo-academico',
    label: 'Trabajo académico',
    items: [
      { to: '/tasks', label: 'Tareas', permission: PERMISSIONS.TASKS_READ },
      { to: '/task-assignments', label: 'Asignaciones', permission: PERMISSIONS.TASKS_READ },
      { to: '/task-submissions', label: 'Entregas', permission: PERMISSIONS.TASKS_READ },
    ],
  },
  {
    id: 'comunicacion',
    label: 'Comunicación',
    items: [
      {
        to: '/communications',
        label: 'Comunicaciones',
        permission: PERMISSIONS.COMMUNICATIONS_READ,
      },
      {
        to: '/communication-inbox',
        label: 'Bandeja de entrada',
        permission: PERMISSIONS.COMMUNICATIONS_READ,
      },
      { to: '/signatures', label: 'Firmas', permission: PERMISSIONS.SIGNATURES_READ },
      { to: '/notifications', label: 'Notificaciones', permission: PERMISSIONS.NOTIFICATIONS_READ },
    ],
  },
  {
    id: 'convivencia',
    label: 'Convivencia',
    items: [
      {
        to: '/student-follow-ups',
        label: 'Observador',
        permission: PERMISSIONS.STUDENT_FOLLOW_UPS_READ,
      },
      {
        to: '/student-follow-ups/categories',
        label: 'Categorías',
        permission: PERMISSIONS.STUDENT_FOLLOW_UPS_CATEGORIES,
      },
    ],
  },
  {
    id: 'comunidad',
    label: 'Comunidad',
    items: [{ to: '/guardians', label: 'Acudientes', permission: PERMISSIONS.GUARDIANS_READ }],
  },
  {
    id: 'administracion',
    label: 'Administración',
    items: [
      { to: '/institution', label: 'Mi institución', permission: PERMISSIONS.INSTITUTION_READ },
      { to: '/admin/users', label: 'Usuarios', permission: PERMISSIONS.USERS_READ },
      {
        to: '/admin/requests',
        label: 'Solicitudes de acceso',
        permission: PERMISSIONS.MEMBERSHIPS_MANAGE,
      },
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

function persistExpanded(next: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // almacenamiento no disponible: no bloquear navegacion
  }
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

function SidebarSkeleton({ isMobile }: { isMobile: boolean }) {
  return (
    <nav
      className={`${isMobile ? 'flex flex-col gap-1 h-full max-h-full' : 'hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200'}`}
      aria-label="Main navigation"
      aria-busy="true"
    >
      <div className="flex-1 py-4 overflow-y-auto overscroll-contain min-h-0">
        <ul className="space-y-1 px-3">
          {[1, 2, 3, 4].map((i) => (
            <li key={i}>
              <div className="flex w-full items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg">
                <div
                  className="h-3 bg-gray-200 rounded animate-pulse"
                  style={{ width: `${60 + i * 10}%` }}
                />
              </div>
              {i <= 2 && (
                <ul className="mt-1 ml-2 space-y-1 border-l border-gray-200 pl-2">
                  {[1, 2].map((j) => (
                    <li key={j}>
                      <div className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg">
                        <div
                          className="h-3 bg-gray-100 rounded animate-pulse"
                          style={{ width: `${50 + j * 15}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export function Sidebar({ isMobile = false, onNavigate }: SidebarProps) {
  const { hasPermission, isLoading } = usePermissions();
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

  // Acordeón: la categoría activa controla el estado. Al navegar, la activa
  // se abre y las demás se colapsan (incluido back/forward y rutas directas).
  // La persistencia es informativa y nunca impide este comportamiento.
  useEffect(() => {
    if (activeCategoryId) {
      setExpanded((prev) => {
        const next: Record<string, boolean> = { [activeCategoryId]: true };
        if (prev[activeCategoryId] === true && Object.keys(prev).length === 1) return prev;
        persistExpanded(next);
        return next;
      });
    }
  }, [activeCategoryId]);

  if (isLoading) {
    return <SidebarSkeleton isMobile={isMobile} />;
  }

  const toggleCategory = (id: string) => {
    // La categoría activa permanece abierta mientras se navega en ella.
    if (id === activeCategoryId && isExpanded(id)) return;
    setExpanded((prev) => {
      const next: Record<string, boolean> = prev[id] ? {} : { [id]: true };
      persistExpanded(next);
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const target = e.target as HTMLElement;
    const list = e.currentTarget;
    const focusable = Array.from(
      list.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>(
        'button[aria-expanded], a[href]',
      ),
    );
    const idx = focusable.indexOf(target as HTMLButtonElement & HTMLAnchorElement);
    if (idx === -1) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusable[idx + 1]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusable[idx - 1]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusable[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      focusable[focusable.length - 1]?.focus();
    }
  };

  const isExpanded = (id: string) => {
    if (id in expanded) return expanded[id];
    // Por defecto: categoria activa expandida, resto colapsadas para no alargar el menu
    return id === activeCategoryId;
  };

  return (
    <nav
      className={`${isMobile ? 'flex flex-col gap-1 h-full max-h-full' : 'hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200'}`}
      aria-label="Main navigation"
    >
      <div className="flex-1 py-4 overflow-y-auto overscroll-contain min-h-0">
        <ul className="space-y-1 px-3" onKeyDown={handleKeyDown}>
          {visibleCategories.map((cat) => {
            const open = isExpanded(cat.id);
            const containsActive = cat.items.some((item) =>
              isPathActive(item.to, location.pathname),
            );
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  aria-expanded={open}
                  aria-label={`Categoría ${cat.label}`}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors ${
                    containsActive ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
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
                          end={item.to === '/dashboard'}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                              isActive || isPathActive(item.to, location.pathname)
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`
                          }
                        >
                          {item.label}
                          {item.to === '/communication-inbox' && unreadCount > 0 && (
                            <span
                              className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white"
                              aria-label={`${unreadCount} mensajes sin leer`}
                            >
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
