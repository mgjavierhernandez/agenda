import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { InstitutionProfilePage } from '../pages/InstitutionProfilePage';
import { InstitutionUsersPage } from '../pages/InstitutionUsersPage';
import { CreateUserPage } from '../pages/CreateUserPage';
import { UserDetailPage } from '../pages/UserDetailPage';
import { apiClient } from '@/api/client';
import type { Institution, PaginatedApiResponse, UserMembership } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockHasPermission = vi.fn().mockReturnValue(true);
let mockNavigate: ReturnType<typeof vi.fn>;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ membershipId: 'mem-1' }),
  };
});

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
    user: { id: 'user-1', email: 'test@test.com', firstName: 'Test', lastName: 'User' },
  }),
}));

const mockInstitution: Institution = {
  id: 'inst-1',
  name: 'Demo School',
  slug: 'demo-school',
  status: 'ACTIVE',
};

const mockRoles = [
  { id: 'role-admin', name: 'INSTITUTION_ADMIN', description: null, isSystem: true, assignable: true },
  { id: 'role-teacher', name: 'TEACHER', description: null, isSystem: true, assignable: true },
];

const mockMembership: UserMembership = {
  id: 'mem-1',
  status: 'ACTIVE',
  userId: 'user-1',
  institutionId: 'inst-1',
  user: {
    id: 'user-1',
    email: 'admin@demo-school.dev',
    firstName: 'Admin',
    lastName: 'Demo',
    status: 'ACTIVE',
  },
  roles: [{ id: 'ur-1', role: { id: 'role-admin', name: 'INSTITUTION_ADMIN' } }],
};

const mockMembershipsPage: PaginatedApiResponse<UserMembership> = {
  data: [mockMembership],
  meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
};

function mockGetByUrl(overrides: Record<string, unknown> = {}) {
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    if (overrides[url]) return Promise.resolve(overrides[url] as never);
    if (url.startsWith('/institutions/inst-1/memberships/')) return Promise.resolve(mockMembership as never);
    if (url.startsWith('/institutions/inst-1/memberships')) return Promise.resolve(mockMembershipsPage as never);
    if (url.startsWith('/institutions/')) return Promise.resolve(mockInstitution as never);
    if (url === '/roles') return Promise.resolve(mockRoles as never);
    return Promise.resolve(undefined as never);
  });
}

const createWrapper = (initialEntries?: string[]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe('InstitutionProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockGetByUrl();
  });

  it('renders the institution profile', async () => {
    render(<InstitutionProfilePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Demo School')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('demo-school')).toBeInTheDocument();
  });

  it('saves changes', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ ...mockInstitution, name: 'Nuevo Nombre' });

    render(<InstitutionProfilePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Demo School')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Demo School') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Nuevo Nombre' } });

    await waitFor(() => {
      expect((screen.getByDisplayValue('Nuevo Nombre') as HTMLInputElement).value).toBe('Nuevo Nombre');
    });

    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(screen.getByText('Cambios guardados correctamente.')).toBeInTheDocument();
    });
    expect(apiClient.patch).toHaveBeenCalledWith('/institutions/inst-1', {
      name: 'Nuevo Nombre',
      slug: 'demo-school',
      status: 'ACTIVE',
    });
  });

  it('hides save buttons when user cannot edit', async () => {
    mockHasPermission.mockImplementation((perm: string) => perm !== 'institution:update');

    render(<InstitutionProfilePage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Demo School')).toBeInTheDocument();
    });
    expect(screen.queryByText('Guardar cambios')).not.toBeInTheDocument();
  });
});

describe('InstitutionUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockNavigate = vi.fn();
    mockGetByUrl();
  });

  it('renders the page header and members', async () => {
    render(<InstitutionUsersPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText('Admin Demo').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('admin@demo-school.dev').length).toBeGreaterThan(0);
    expect(screen.getAllByText('INSTITUTION_ADMIN').length).toBeGreaterThan(0);
  });

  it('shows new user button', async () => {
    render(<InstitutionUsersPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Nuevo usuario')).toBeInTheDocument();
    });
  });

  it('hides new user button for read-only users', async () => {
    mockHasPermission.mockImplementation(
      (perm: string) => perm !== 'users:create' && perm !== 'memberships:manage',
    );

    render(<InstitutionUsersPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.queryByText('Nuevo usuario')).not.toBeInTheDocument();
    });
  });

  it('renders empty state', async () => {
    vi.mocked(apiClient.get).mockImplementation(() => Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    } as PaginatedApiResponse<UserMembership> as never));

    render(<InstitutionUsersPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No hay usuarios vinculados')).toBeInTheDocument();
    });
  });
});

describe('CreateUserPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockNavigate = vi.fn();
    mockGetByUrl();
  });

  it('renders the create user form', () => {
    render(<CreateUserPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Nuevo usuario')).toBeInTheDocument();
    expect(screen.getByText('Crear usuario')).toBeInTheDocument();
  });

  it('renders role checkboxes', async () => {
    render(<CreateUserPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('INSTITUTION_ADMIN')).toBeInTheDocument();
      expect(screen.getByText('TEACHER')).toBeInTheDocument();
    });
  });

  it('shows permission error when user cannot create', () => {
    mockHasPermission.mockReturnValue(false);

    render(<CreateUserPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/No tienes permisos para crear usuarios/)).toBeInTheDocument();
  });
});

describe('UserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockNavigate = vi.fn();
    mockGetByUrl();
    vi.mocked(apiClient.delete).mockResolvedValue({});
  });

  it('renders user details and roles', async () => {
    render(<UserDetailPage />, { wrapper: createWrapper(['/admin/users/mem-1']) });

    await waitFor(() => {
      expect(screen.getAllByText(/Admin Demo/).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('admin@demo-school.dev').length).toBeGreaterThan(0);
    expect(screen.getAllByText('INSTITUTION_ADMIN').length).toBeGreaterThan(0);
  });

  it('shows assign role button for managers', async () => {
    render(<UserDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('+ TEACHER')).toBeInTheDocument();
    });
  });

  it('hides role management for non-managers', async () => {
    mockHasPermission.mockImplementation((perm: string) => perm !== 'memberships:manage');

    render(<UserDetailPage />, { wrapper: createWrapper(['/admin/users/mem-1']) });

    await waitFor(() => {
      expect(screen.getAllByText(/Admin Demo/).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('+ TEACHER')).not.toBeInTheDocument();
    expect(screen.queryByText('Desvincular usuario')).not.toBeInTheDocument();
  });

  it('unlinks a user', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<UserDetailPage />, { wrapper: createWrapper(['/admin/users/mem-1']) });

    await waitFor(() => {
      expect(screen.getAllByText(/Admin Demo/).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByText('Desvincular usuario'));

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith(
        '/institutions/inst-1/memberships/user/user-1',
      );
    });
  });
});
