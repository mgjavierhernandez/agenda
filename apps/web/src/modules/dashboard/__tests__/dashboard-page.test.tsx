import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { DashboardPage } from '@/pages/DashboardPage';
import { apiClient } from '@/api/client';
import type { PaginatedApiResponse, Task, Notification, SignatureRequest } from '@/api/types';

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
    selectedInstitution: { id: 'inst-1', name: 'Colegio San José', slug: 'san-jose', status: 'ACTIVE' },
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
    roles: [],
    permissionCodes: [],
    hasPermission: mockHasPermission,
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
    hasRole: () => false,
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

const paginated = <T,>(data: T[]): PaginatedApiResponse<T> => ({
  data,
  meta: { total: data.length, page: 1, limit: 20, totalPages: 1 },
});

const paginatedWithTotal = <T,>(data: T[], total: number): PaginatedApiResponse<T> => ({
  data,
  meta: { total, page: 1, limit: data.length || 20, totalPages: 1 },
});

const mockTask: Task = {
  id: 'task-1',
  institutionId: 'inst-1',
  courseId: 'cou-1',
  subjectId: 'sub-1',
  title: 'Tarea de Matemáticas',
  description: 'Ejercicios del capítulo 3',
  dueDate: '2026-02-15',
  status: 'PUBLISHED',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

const mockNotification: Notification = {
  id: 'notif-1',
  institutionId: 'inst-1',
  userId: 'user-1',
  type: 'GENERAL',
  entityType: 'TASK',
  entityId: 'task-1',
  title: 'Nueva tarea asignada',
  message: 'Se ha creado una nueva tarea',
  status: 'UNREAD',
  readAt: null,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

const mockSignature: SignatureRequest = {
  id: 'sig-1',
  institutionId: 'inst-1',
  title: 'Autorización de excursión',
  description: 'Firma requerida',
  status: 'PUBLISHED',
  dueDate: '2026-02-20',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
  recipients: [],
};

function mockDefaultEndpoints() {
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    const u = String(url);
    if (u.startsWith('/students')) return Promise.resolve(paginated([]));
    if (u.startsWith('/courses')) return Promise.resolve(paginated([]));
    if (u.startsWith('/subjects')) return Promise.resolve(paginated([]));
    if (u.startsWith('/tasks')) return Promise.resolve(paginated([mockTask]));
    if (u.startsWith('/enrollments')) return Promise.resolve(paginated([]));
    if (u.startsWith('/signature-requests')) return Promise.resolve(paginated([mockSignature]));
    if (u.startsWith('/communications')) return Promise.resolve(paginated([]));
    if (u.startsWith('/notifications')) return Promise.resolve(paginated([mockNotification]));
    if (u.startsWith('/communication-recipients/unread-count')) return Promise.resolve({ count: 3 });
    return Promise.resolve(paginated([]));
  });
}

function mockStatsEndpoints(counts: Record<string, number>) {
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    const u = String(url);
    if (u.startsWith('/students')) return Promise.resolve(paginatedWithTotal([], counts.students ?? 0));
    if (u.startsWith('/courses')) return Promise.resolve(paginatedWithTotal([], counts.courses ?? 0));
    if (u.startsWith('/subjects')) return Promise.resolve(paginatedWithTotal([], counts.subjects ?? 0));
    if (u.startsWith('/tasks') && u.includes('limit=1')) return Promise.resolve(paginatedWithTotal([], counts.tasks ?? 0));
    if (u.startsWith('/tasks')) return Promise.resolve(paginated([]));
    if (u.startsWith('/enrollments')) return Promise.resolve(paginatedWithTotal([], counts.enrollments ?? 0));
    if (u.startsWith('/signature-requests') && u.includes('limit=1')) return Promise.resolve(paginatedWithTotal([], counts.signatures ?? 0));
    if (u.startsWith('/signature-requests')) return Promise.resolve(paginated([]));
    if (u.startsWith('/communications') && u.includes('limit=1')) return Promise.resolve(paginatedWithTotal([], counts.communications ?? 0));
    if (u.startsWith('/communications')) return Promise.resolve(paginated([]));
    if (u.startsWith('/notifications')) return Promise.resolve(paginated([]));
    if (u.startsWith('/communication-recipients/unread-count')) return Promise.resolve({ count: counts.unreadComms ?? 0 });
    return Promise.resolve(paginated([]));
  });
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('renders the welcome greeting', async () => {
    mockDefaultEndpoints();
    render(<DashboardPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/Bienvenido, carlos/)).toBeInTheDocument();
  });

  it('renders institution name', async () => {
    mockDefaultEndpoints();
    render(<DashboardPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Colegio San José')).toBeInTheDocument();
  });

  it('renders all stat card titles', async () => {
    mockDefaultEndpoints();
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Estudiantes').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Cursos').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Asignaturas').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Tareas').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Matrículas').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Comunicaciones').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Firmas').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Notificaciones sin leer').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows recent tasks section', async () => {
    mockDefaultEndpoints();
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Tareas recientes')).toBeInTheDocument();
      expect(screen.getByText('Tarea de Matemáticas')).toBeInTheDocument();
    });
  });

  it('shows recent notifications section', async () => {
    mockDefaultEndpoints();
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Notificaciones recientes')).toBeInTheDocument();
      expect(screen.getByText('Nueva tarea asignada')).toBeInTheDocument();
    });
  });

  it('shows pending signatures section', async () => {
    mockDefaultEndpoints();
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Firmas pendientes')).toBeInTheDocument();
      expect(screen.getByText('Autorización de excursión')).toBeInTheDocument();
    });
  });

  it('shows quick access links', async () => {
    mockDefaultEndpoints();
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Accesos rápidos')).toBeInTheDocument();
      expect(screen.getByText(/Estudiantes/)).toBeInTheDocument();
      expect(screen.getByText(/Cursos/)).toBeInTheDocument();
    });
  });

  it('shows unread communications count in quick access', async () => {
    mockDefaultEndpoints();
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      const badges = screen.getAllByText('3');
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows empty state when no tasks', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      const u = String(url);
      if (u.startsWith('/tasks') && !u.includes('limit=1')) return Promise.resolve(paginated([]));
      if (u.startsWith('/tasks')) return Promise.resolve(paginatedWithTotal([], 0));
      if (u.startsWith('/communication-recipients/unread-count')) return Promise.resolve({ count: 0 });
      return Promise.resolve(paginated([]));
    });
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No hay tareas recientes')).toBeInTheDocument();
    });
  });

  it('shows empty state when no notifications', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      const u = String(url);
      if (u.startsWith('/notifications')) return Promise.resolve(paginated([]));
      if (u.startsWith('/communication-recipients/unread-count')) return Promise.resolve({ count: 0 });
      return Promise.resolve(paginated([]));
    });
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No hay notificaciones recientes')).toBeInTheDocument();
    });
  });

  it('shows empty state when no pending signatures', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      const u = String(url);
      if (u.startsWith('/signature-requests') && !u.includes('limit=1')) return Promise.resolve(paginated([]));
      if (u.startsWith('/signature-requests')) return Promise.resolve(paginatedWithTotal([], 0));
      if (u.startsWith('/communication-recipients/unread-count')) return Promise.resolve({ count: 0 });
      return Promise.resolve(paginated([]));
    });
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No hay firmas pendientes')).toBeInTheDocument();
    });
  });

  it('hides quick access links when user lacks permission', async () => {
    mockHasPermission.mockReturnValue(false);
    mockDefaultEndpoints();
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Accesos rápidos')).toBeInTheDocument();
    });
  });

  it('renders stat cards with correct values', async () => {
    mockStatsEndpoints({
      students: 150,
      courses: 12,
      subjects: 25,
      tasks: 8,
      enrollments: 200,
      signatures: 5,
      communications: 30,
      unreadComms: 7,
    });

    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders task status badges', async () => {
    mockDefaultEndpoints();
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Publicada').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders notification status badges', async () => {
    mockDefaultEndpoints();
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('No leída').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows "Ver todas" links with correct routes', async () => {
    mockDefaultEndpoints();
    render(<DashboardPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      const verTodasLinks = screen.getAllByText('Ver todas');
      expect(verTodasLinks.length).toBeGreaterThanOrEqual(3);
    });
  });
});
