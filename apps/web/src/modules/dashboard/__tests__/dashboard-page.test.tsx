import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { DashboardPage } from '@/pages/DashboardPage';
import { apiClient } from '@/api/client';
import type { RoleDashboard } from '@/modules/dashboard/hooks';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockUser = { id: 'user-1', email: 'carlos@test.com', status: 'ACTIVE' as const };

vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}));

vi.mock('@/tenant/tenant.store', () => ({
  useTenant: () => ({
    selectedInstitution: {
      id: 'inst-1',
      name: 'Colegio San José',
      slug: 'san-jose',
      status: 'ACTIVE',
    },
    isTenantReady: true,
    hasMultipleInstitutions: false,
    needsInstitutionSelection: false,
    institutions: [],
    selectedInstitutionId: 'inst-1',
    selectInstitution: vi.fn(),
  }),
}));

const mockHasPermission = vi.fn().mockReturnValue(true);

vi.mock('@/permissions/usePermissions', () => ({
  usePermissions: () => ({
    permissionCodes: [],
    isLoading: false,
    isError: false,
    hasPermission: mockHasPermission,
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
  }),
}));

const createWrapper = (initialEntries: string[] = ['/dashboard']) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

const emptyDashboard = (role: RoleDashboard['role']): RoleDashboard => ({
  role,
  activePeriod: null,
  stats: {},
  children: [],
  courses: [],
  subjects: [],
  recentNotifications: [],
  upcomingEvents: [],
  recentCommunications: [],
  pendingSignatures: [],
  followUps: [],
  pendingCommitments: [],
});

const adminDashboard: RoleDashboard = {
  role: 'INSTITUTION_ADMIN',
  activePeriod: {
    id: 'period-1',
    name: 'Período 1',
    code: 'P1',
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2026-06-30T00:00:00Z',
    status: 'ACTIVE',
  },
  stats: { students: 150, teachers: 20, courses: 12, subjects: 25, pendingFollowUps: 4 },
  children: [],
  courses: [],
  subjects: [],
  recentNotifications: [
    {
      id: 'notif-1',
      type: 'GENERAL',
      title: 'Nueva tarea asignada',
      message: 'Se ha creado una nueva tarea',
      status: 'UNREAD',
      createdAt: '2026-01-15T10:00:00Z',
    },
  ],
  upcomingEvents: [
    {
      id: 'event-1',
      title: 'Reunión de padres',
      description: null,
      startAt: '2026-02-10T14:00:00Z',
      endAt: '2026-02-10T15:00:00Z',
      location: 'Auditorio',
    },
  ],
  recentCommunications: [
    {
      id: 'comm-1',
      title: 'Comunicado de inicio de año',
      content: 'Hola',
      publishedAt: '2026-01-05T10:00:00Z',
    },
  ],
  pendingSignatures: [
    {
      id: 'sig-1',
      title: 'Autorización de excursión',
      description: 'Firma requerida',
      dueDate: '2026-02-20T00:00:00Z',
    },
  ],
  followUps: [
    {
      id: 'fu-1',
      title: 'Seguimiento académico',
      confidentiality: 'INTERNAL',
      status: 'OPEN',
      createdAt: '2026-01-10T10:00:00Z',
      studentId: 'stu-1',
    },
  ],
  pendingCommitments: [
    {
      id: 'co-1',
      description: 'Presentar reporte',
      status: 'PENDING',
      dueDate: '2026-02-01T00:00:00Z',
    },
  ],
};

function mockDashboard(payload: RoleDashboard, unreadCount = 3) {
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    const u = String(url);
    if (u === '/dashboard') return Promise.resolve(payload);
    if (u === '/communication-recipients/unread-count')
      return Promise.resolve({ count: unreadCount });
    return Promise.resolve({});
  });
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('renders the welcome greeting', async () => {
    mockDashboard(adminDashboard);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Bienvenido, carlos/)).toBeInTheDocument();
    });
  });

  it('renders institution name', async () => {
    mockDashboard(adminDashboard);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Colegio San José')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton while fetching', () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />, { wrapper: createWrapper() });
    expect(screen.getByLabelText('Cargando panel')).toBeInTheDocument();
  });

  it('shows error state when the dashboard request fails', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('boom'));
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No se pudo cargar el panel.')).toBeInTheDocument();
    });
  });

  it('shows empty state when the dashboard has no content', async () => {
    mockDashboard(emptyDashboard('STUDENT'), 0);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No hay información disponible todavía.')).toBeInTheDocument();
    });
  });

  it('renders the active academic period for admins', async () => {
    mockDashboard(adminDashboard);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Período activo')).toBeInTheDocument();
      expect(screen.getByText(/Período 1/)).toBeInTheDocument();
    });
  });

  it('renders admin stat cards', async () => {
    mockDashboard(adminDashboard);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Estudiantes').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Docentes')).toBeInTheDocument();
      expect(screen.getByText('Seguimientos pendientes')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  it('renders admin recent lists', async () => {
    mockDashboard(adminDashboard);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Reunión de padres')).toBeInTheDocument();
      expect(screen.getByText('Comunicado de inicio de año')).toBeInTheDocument();
      expect(screen.getByText('Autorización de excursión')).toBeInTheDocument();
      expect(screen.getByText('Seguimiento académico')).toBeInTheDocument();
      expect(screen.getByText('Presentar reporte')).toBeInTheDocument();
      expect(screen.getByText('Nueva tarea asignada')).toBeInTheDocument();
    });
  });

  it('renders teacher dashboard with their courses and subjects', async () => {
    const payload: RoleDashboard = {
      ...emptyDashboard('TEACHER'),
      stats: { courses: 2, students: 40 },
      courses: [
        { id: 'cou-1', code: 'M-101', name: 'Matemáticas I', status: 'ACTIVE' },
        { id: 'cou-2', code: 'F-101', name: 'Física I', status: 'ACTIVE' },
      ],
      subjects: [{ id: 'sub-1', code: 'MAT', name: 'Álgebra', status: 'ACTIVE' }],
    };
    mockDashboard(payload);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Matemáticas I (M-101)')).toBeInTheDocument();
      expect(screen.getByText('Física I (F-101)')).toBeInTheDocument();
      expect(screen.getByText('Álgebra (MAT)')).toBeInTheDocument();
      expect(screen.getAllByText('40').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders parent dashboard with their children', async () => {
    const payload: RoleDashboard = {
      ...emptyDashboard('PARENT'),
      stats: { children: 2 },
      children: [
        { id: 'stu-1', firstName: 'Ana', lastName: 'Gómez', status: 'ACTIVE' },
        { id: 'stu-2', firstName: 'Luis', lastName: 'Gómez', status: 'ACTIVE' },
      ],
    };
    mockDashboard(payload);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Hijos')).toBeInTheDocument();
      expect(screen.getByText('Ana Gómez')).toBeInTheDocument();
      expect(screen.getByText('Luis Gómez')).toBeInTheDocument();
    });
  });

  it('renders student dashboard with their courses', async () => {
    const payload: RoleDashboard = {
      ...emptyDashboard('STUDENT'),
      stats: { enrollments: 2, followUps: 1 },
      courses: [{ id: 'cou-1', code: 'M-101', name: 'Matemáticas I', status: 'ACTIVE' }],
    };
    mockDashboard(payload);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Matrículas').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Matemáticas I (M-101)')).toBeInTheDocument();
    });
  });

  it('shows unread communications count in quick access', async () => {
    mockDashboard(adminDashboard, 7);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows quick access links with routes', async () => {
    mockDashboard(adminDashboard);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Accesos rápidos')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Estudiantes/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Notas/ })).toBeInTheDocument();
    });
  });

  it('hides quick access links when the user lacks permissions', async () => {
    mockHasPermission.mockReturnValue(false);
    mockDashboard(adminDashboard, 0);
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Accesos rápidos')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Estudiantes/ })).not.toBeInTheDocument();
    });
  });
});
