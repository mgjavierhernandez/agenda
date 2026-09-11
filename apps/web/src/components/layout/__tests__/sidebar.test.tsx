import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Sidebar, NAV_CATEGORIES } from '../Sidebar';

const mockHasPermission = vi.fn<(code: string) => boolean>();
const mockUnreadCount = vi.fn(() => ({ data: { count: 0 } }));

vi.mock('@/permissions/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: mockHasPermission }),
}));

vi.mock('@/modules/communication-recipients/hooks', () => ({
  useUnreadCommunicationsCount: () => mockUnreadCount(),
}));

function renderSidebar(initialPath = '/dashboard') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(<Sidebar />, { wrapper });
}

describe('Sidebar por categorias', () => {
  beforeEach(() => {
    localStorage.clear();
    mockHasPermission.mockReset();
    mockUnreadCount.mockReset();
    mockUnreadCount.mockReturnValue({ data: { count: 0 } });
  });

  it('conserva todas las rutas existentes agrupadas (sin eliminar modulos)', () => {
    mockHasPermission.mockReturnValue(true);
    renderSidebar('/dashboard');
    const allTos = NAV_CATEGORIES.flatMap((c) => c.items.map((i) => i.to));
    for (const to of [
      '/dashboard', '/agenda', '/students', '/courses', '/subjects', '/areas',
      '/grades', '/schedules', '/schedules/blocks', '/schedules/classrooms',
      '/tasks', '/task-assignments', '/task-submissions', '/communications',
      '/communication-inbox', '/signatures', '/notifications', '/academic-periods',
      '/school-grades', '/guardians', '/enrollments', '/teacher-assignments',
      '/course-directors', '/teachers', '/student-follow-ups',
      '/student-follow-ups/categories', '/attendance', '/reports', '/reports/course',
      '/institution', '/admin/users', '/admin/requests', '/profile', '/students/import',
    ]) {
      expect(allTos).toContain(to);
    }
    expect(allTos).toHaveLength(34);
  });

  it('admin ve categorias administrativas y gestion academica/docente', () => {
    mockHasPermission.mockReturnValue(true);
    renderSidebar('/course-directors');
    expect(screen.getByRole('button', { name: /Categoría Administración/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Categoría Gestión académica/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Categoría Gestión docente/i })).toBeInTheDocument();
    expect(screen.getByText('Directores de grupo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Categoría Administración/i }));
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Categoría Gestión académica/i }));
    expect(screen.getByText('Estudiantes')).toBeInTheDocument();
  });

  it('docente sin permisos admin ve Mi perfil pero NO ve Usuarios ni Mi institucion', () => {
    mockHasPermission.mockImplementation((code: string) =>
      ['agenda:read', 'teacher-assignments:read', 'courses:read'].includes(code),
    );
    renderSidebar('/dashboard');
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
    expect(screen.queryByText('Mi institución')).not.toBeInTheDocument();
    // Mi perfil vive en Inicio, visible sin permisos administrativos
    expect(screen.getByText('Mi perfil')).toBeInTheDocument();
  });

  it('estudiante solo ve lo permitido (sin gestion docente/admin)', () => {
    mockHasPermission.mockImplementation((code: string) =>
      ['tasks:read', 'grades:read', 'communications:read'].includes(code),
    );
    renderSidebar('/tasks');
    expect(screen.queryByText('Directores de grupo')).not.toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Categoría Gestión docente/i })).not.toBeInTheDocument();
    // Mi perfil vive en Inicio (expandir si está colapsada)
    fireEvent.click(screen.getByRole('button', { name: /Categoría Inicio/i }));
    expect(screen.getByText('Mi perfil')).toBeInTheDocument();
  });

  it('expande/colapsa categorias y recuerda estado', () => {
    mockHasPermission.mockReturnValue(true);
    renderSidebar('/dashboard');
    const btn = screen.getByRole('button', { name: /Categoría Comunicación/i });
    expect(screen.queryByText('Bandeja de entrada')).not.toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.getByText('Bandeja de entrada')).toBeInTheDocument();
    expect(localStorage.getItem('agenda-sidebar-expanded')).toContain('comunicacion');
    fireEvent.click(btn);
    expect(screen.queryByText('Bandeja de entrada')).not.toBeInTheDocument();
  });

  it('auto-expande y resalta la categoria activa (Directores de grupo)', () => {
    mockHasPermission.mockReturnValue(true);
    renderSidebar('/course-directors');
    expect(screen.getByText('Directores de grupo')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Directores de grupo/ });
    expect(link.className).toMatch(/bg-blue-50/);
  });

  it('acordeón: solo la categoría activa permanece abierta', () => {
    mockHasPermission.mockReturnValue(true);
    renderSidebar('/grades');
    // Activa abierta…
    expect(screen.getByText('Notas')).toBeInTheDocument();
    // …y las demás colapsadas aunque hubiera estado persistido múltiple.
    expect(screen.queryByText('Bandeja de entrada')).not.toBeInTheDocument();
    expect(screen.queryByText('Directores de grupo')).not.toBeInTheDocument();
  });

  it('normaliza estado persistido múltiple a solo la activa', () => {
    mockHasPermission.mockReturnValue(true);
    localStorage.setItem(
      'agenda-sidebar-expanded',
      JSON.stringify({ comunicacion: true, 'gestion-docente': true }),
    );
    renderSidebar('/dashboard');
    // Al navegar, la persistencia no impide que solo la activa controle el estado.
    expect(screen.queryByText('Bandeja de entrada')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('no muestra franjas ni aulas sin permiso de gestión', () => {
    mockHasPermission.mockImplementation((code: string) =>
      ['schedules:read'].includes(code),
    );
    renderSidebar('/schedules');
    expect(screen.getByText('Horarios', { selector: 'a' })).toBeDefined();
    expect(screen.queryByText('Franjas horarias')).not.toBeInTheDocument();
    expect(screen.queryByText('Aulas')).not.toBeInTheDocument();
  });

  it('no renderiza iconos en el menú', () => {
    mockHasPermission.mockReturnValue(true);
    const { container } = renderSidebar('/dashboard');
    expect(container.textContent).not.toMatch(/🏠|📊|🎓|📚|📢|⚙️/);
  });
});