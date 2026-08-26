import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { GuardiansPage } from '../pages/GuardiansPage';
import { GuardiansFormPage } from '../pages/GuardiansFormPage';
import { apiClient } from '@/api/client';
import type { GuardianStudentWithStudent, PaginatedApiResponse, DocumentType } from '@/api/types';

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
    user: { id: 'user-1', email: 'test@test.com', firstName: 'Test', lastName: 'User' },
  }),
}));

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

const mockStudent = {
  id: 'stu-1',
  institutionId: 'inst-1',
  firstName: 'Juan',
  lastName: 'Pérez',
  documentType: 'CC' as DocumentType,
  documentNumber: '1234567890',
  dateOfBirth: '2010-01-15',
  status: 'ACTIVE' as const,
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

const mockLink: GuardianStudentWithStudent = {
  id: 'gs-1',
  institutionId: 'inst-1',
  guardianUserId: 'user-1',
  studentId: 'stu-1',
  relationshipType: 'FATHER',
  isPrimary: true,
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
  student: mockStudent,
};

describe('GuardiansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('renders the page header', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

    render(<GuardiansPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Acudientes')).toBeInTheDocument();
  });

  it('renders empty state when no links', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

    render(<GuardiansPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No hay vinculaciones de acudientes')).toBeInTheDocument();
    });
  });

  it('renders links in a table', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockLink],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } as PaginatedApiResponse<GuardianStudentWithStudent>);

    render(<GuardiansPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThan(0);
    });
  });

  it('shows relationship type', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockLink],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } as PaginatedApiResponse<GuardianStudentWithStudent>);

    render(<GuardiansPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Padre').length).toBeGreaterThan(0);
    });
  });

  it('shows primary badge', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockLink],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } as PaginatedApiResponse<GuardianStudentWithStudent>);

    render(<GuardiansPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Sí').length).toBeGreaterThan(0);
    });
  });

  it('shows new link button for managers', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

    render(<GuardiansPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Nueva vinculación')).toBeInTheDocument();
    });
  });

  it('hides new link button for non-managers', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    mockHasPermission.mockImplementation((perm: string) => perm !== 'guardians:manage');

    render(<GuardiansPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.queryByText('Nueva vinculación')).not.toBeInTheDocument();
    });
  });

  it('shows unlink button for active links with manage permission', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockLink],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } as PaginatedApiResponse<GuardianStudentWithStudent>);

    render(<GuardiansPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Desvincular').length).toBeGreaterThan(0);
    });
  });

  it('renders student document number', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockLink],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } as PaginatedApiResponse<GuardianStudentWithStudent>);

    render(<GuardiansPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Doc: 1234567890').length).toBeGreaterThan(0);
    });
  });
});

describe('GuardiansFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('renders create form', () => {
    render(<GuardiansFormPage />, { wrapper: createWrapper(['/guardians/new']) });

    expect(screen.getByText('Nueva vinculación')).toBeInTheDocument();
    expect(screen.getByText('Vincular acudiente')).toBeInTheDocument();
  });

  it('renders form fields', () => {
    render(<GuardiansFormPage />, { wrapper: createWrapper(['/guardians/new']) });

    expect(screen.getByLabelText('ID del Estudiante')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo de relación')).toBeInTheDocument();
    expect(screen.getByLabelText('Acudiente principal')).toBeInTheDocument();
  });

  it('validates required student ID', async () => {
    render(<GuardiansFormPage />, { wrapper: createWrapper(['/guardians/new']) });

    const submitButton = screen.getByText('Vincular acudiente');
    submitButton.click();

    await waitFor(() => {
      expect(screen.getByText('El ID del estudiante es requerido')).toBeInTheDocument();
    });
  });

  it('validates UUID format', async () => {
    render(<GuardiansFormPage />, { wrapper: createWrapper(['/guardians/new']) });

    const studentIdInput = screen.getByLabelText('ID del Estudiante');
    fireEvent.change(studentIdInput, { target: { value: 'not-a-uuid' } });

    const submitButton = screen.getByText('Vincular acudiente');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('El ID del estudiante debe ser un UUID válido')).toBeInTheDocument();
    });
  });

  it('validates required relationship type', async () => {
    render(<GuardiansFormPage />, { wrapper: createWrapper(['/guardians/new']) });

    const submitButton = screen.getByText('Vincular acudiente');
    submitButton.click();

    await waitFor(() => {
      expect(screen.getByText('El tipo de relación es requerido')).toBeInTheDocument();
    });
  });

  it('renders cancel button', () => {
    render(<GuardiansFormPage />, { wrapper: createWrapper(['/guardians/new']) });

    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('hides form when user lacks permission', () => {
    mockHasPermission.mockReturnValue(false);

    render(<GuardiansFormPage />, { wrapper: createWrapper(['/guardians/new']) });

    expect(screen.getByText(/No tienes permisos/)).toBeInTheDocument();
  });

  it('renders relationship type options', () => {
    render(<GuardiansFormPage />, { wrapper: createWrapper(['/guardians/new']) });

    expect(screen.getByText('Padre')).toBeInTheDocument();
    expect(screen.getByText('Madre')).toBeInTheDocument();
    expect(screen.getByText('Representante legal')).toBeInTheDocument();
    expect(screen.getByText('Otro')).toBeInTheDocument();
  });
});
