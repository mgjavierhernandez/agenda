import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { RegisterPage } from '@/pages/RegisterPage';
import { MembershipRequestsPage } from '../pages/MembershipRequestsPage';
import { apiClient } from '@/api/client';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
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

vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({
    selectedInstitutionId: 'inst-1',
    user: { id: 'admin-1', email: 'admin@demo-school.dev', firstName: 'Admin', lastName: 'Demo' },
  }),
}));

const createWrapper = (initialEntries: string[] = ['/']) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe('RegisterPage (GAP-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the public registration form', () => {
    render(<RegisterPage />, { wrapper: createWrapper(['/register']) });

    expect(screen.getByText('Solicitar acceso')).toBeInTheDocument();
    expect(screen.getByLabelText(/Soy/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Institución/)).toBeInTheDocument();
  });

  it('submits a self-registration request and shows pending state', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ message: 'ok', status: 'PENDING' });

    render(<RegisterPage />, { wrapper: createWrapper(['/register?i=demo-school']) });

    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Nuevo' } });
    fireEvent.change(screen.getByLabelText(/Apellido/), { target: { value: 'Docente' } });
    fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: 'nuevo@colegio.edu.co' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText(/Soy/), { target: { value: 'TEACHER' } });

    fireEvent.click(screen.getByText('Enviar solicitud'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/auth/self-register',
        expect.objectContaining({
          email: 'nuevo@colegio.edu.co',
          institutionSlug: 'demo-school',
          requestedRole: 'TEACHER',
        }),
      );
    });
    expect(screen.getByText('Solicitud recibida')).toBeInTheDocument();
  });
});

describe('MembershipRequestsPage (GAP-2)', () => {
  const pendingPage = {
    data: [
      {
        id: 'm-pending',
        status: 'PENDING',
        userId: 'u-1',
        institutionId: 'inst-1',
        requestedRole: 'TEACHER',
        createdAt: '2026-01-01T10:00:00Z',
        user: {
          id: 'u-1',
          email: 'nuevo@colegio.edu.co',
          firstName: 'Nuevo',
          lastName: 'Docente',
          status: 'INACTIVE',
          profiles: [{ documentNumber: '12345678', phone: '3001234567', profession: 'Docente' }],
        },
        roles: [],
      },
    ],
    meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    vi.mocked(apiClient.get).mockResolvedValue(pendingPage);
    vi.mocked(apiClient.post).mockResolvedValue({});
  });

  it('lists pending requests with applicant data', async () => {
    render(<MembershipRequestsPage />, { wrapper: createWrapper(['/admin/requests']) });

    await waitFor(() => {
      expect(screen.getByText('Solicitudes de acceso')).toBeInTheDocument();
      expect(screen.getByText(/Nuevo Docente/)).toBeInTheDocument();
    });
    expect(screen.getByText('nuevo@colegio.edu.co')).toBeInTheDocument();
    expect(screen.getByText('Docente')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/institutions/inst-1/memberships?'),
    );
  });

  it('approves a request', async () => {
    render(<MembershipRequestsPage />, { wrapper: createWrapper(['/admin/requests']) });

    await waitFor(() => {
      expect(screen.getByText(/Nuevo Docente/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Aprobar'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/institutions/inst-1/memberships/m-pending/approve',
        {},
      );
    });
  });

  it('rejects a request after confirmation', async () => {
    render(<MembershipRequestsPage />, { wrapper: createWrapper(['/admin/requests']) });

    await waitFor(() => {
      expect(screen.getByText(/Nuevo Docente/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Rechazar'));
    fireEvent.click(screen.getByText('Confirmar rechazo'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/institutions/inst-1/memberships/m-pending/reject',
        {},
      );
    });
  });

  it('hides the inbox without manage permission', () => {
    mockHasPermission.mockReturnValue(false);

    render(<MembershipRequestsPage />, { wrapper: createWrapper(['/admin/requests']) });

    expect(screen.getByText(/No tienes permisos para gestionar solicitudes/)).toBeInTheDocument();
  });
});
