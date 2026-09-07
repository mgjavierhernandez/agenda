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
      '/institution', '/admin/users', '/admin/requests',
    ]) {
      expect(allTos).toContain(to);
    }
    expect(allTos).toHaveLength(32);
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

  it('docente sin permisos admin NO ve Usuarios ni Mi institucion', () => {
    mockHasPermission.mockImplementation((code: string) =>
      ['agenda:read', 'teacher-assignments:read', 'courses:read'].includes(code),
    );
    renderSidebar('/dashboard');
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
    expect(screen.queryByText('Mi institución')).not.toBeInTheDocument();
    // La categoria Administracion queda oculta al no tener items visibles
    expect(screen.queryByRole('button', { name: /Categoría Administración/i })).not.toBeInTheDocument();
  });

  it('estudiante solo ve lo permitido (sin gestion docente/admin)', () => {
    mockHasPermission.mockImplementation((code: string) =>
      ['tasks:read', 'grades:read', 'communications:read'].includes(code),
    );
    renderSidebar('/tasks');
    expect(screen.queryByText('Directores de grupo')).not.toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Categoría Gestión docente/i })).not.toBeInTheDocument();
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
});
