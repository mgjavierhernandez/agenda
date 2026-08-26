import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { StudentFormPage } from '../pages/StudentFormPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseCreateStudent = vi.fn();
const mockUseStudent = vi.fn();
const mockHasPermission = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({}) };
});

vi.mock('../hooks', () => ({
  useStudent: (...args: unknown[]) => mockUseStudent(...args),
  useCreateStudent: () => mockUseCreateStudent(),
  useUpdateStudent: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/api/errors', () => ({
  getErrorMessage: (err: unknown) => {
    if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
    return 'Ocurrió un error inesperado';
  },
}));

vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'admin@test.com', status: 'ACTIVE' },
    selectedInstitutionId: 'inst-1',
    isAuthenticated: true,
    isInitializing: false,
  }),
}));

vi.mock('@/permissions/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (code: string) => mockHasPermission(code),
    hasAnyPermission: (...codes: string[]) => codes.some((c) => mockHasPermission(c)),
    hasAllPermissions: (...codes: string[]) => codes.every((c) => mockHasPermission(c)),
    permissionCodes: mockHasPermission.mock.calls.length > 0
      ? ['students:read', 'students:manage'].filter((c) => mockHasPermission(c))
      : [],
    isLoading: false,
    isError: false,
  }),
}));

function renderCreateForm() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/students/new']}>
        <StudentFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StudentFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockUseStudent.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseCreateStudent.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders create form when user has students:manage', () => {
    mockHasPermission.mockImplementation((code: string) => code === 'students:manage');
    renderCreateForm();
    expect(screen.getByText('Nuevo estudiante')).toBeDefined();
    expect(screen.getByLabelText(/nombre/i)).toBeDefined();
    expect(screen.getByLabelText(/apellido/i)).toBeDefined();
  });

  it('shows authorization fallback when user lacks students:manage', () => {
    mockHasPermission.mockReturnValue(false);
    renderCreateForm();
    expect(screen.getByText('Acceso no autorizado')).toBeDefined();
    expect(screen.getByText(/No tienes permisos para crear o editar estudiantes/i)).toBeDefined();
    expect(screen.queryByLabelText(/nombre/i)).toBeNull();
  });

  it('shows validation errors on empty submit', async () => {
    mockHasPermission.mockImplementation((code: string) => code === 'students:manage');
    const user = userEvent.setup();
    renderCreateForm();

    await user.click(screen.getByRole('button', { name: /crear estudiante/i }));

    await waitFor(() => {
      expect(screen.getByText(/nombre es requerido/i)).toBeDefined();
      expect(screen.getByText(/apellido es requerido/i)).toBeDefined();
    });
  });

  it('creates student on valid submit', async () => {
    mockHasPermission.mockImplementation((code: string) => code === 'students:manage');
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'new-id',
      firstName: 'María',
      lastName: 'García',
      documentType: 'DNI',
      documentNumber: '98765',
      dateOfBirth: null,
      status: 'ACTIVE',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
    mockUseCreateStudent.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    renderCreateForm();

    await user.type(screen.getByLabelText(/nombre/i), 'María');
    await user.type(screen.getByLabelText(/apellido/i), 'García');
    await user.type(screen.getByLabelText(/número de documento/i), '98765');
    await user.click(screen.getByRole('button', { name: /crear estudiante/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/students/new-id');
    });
  });

  it('does not render form controls when permission is denied', () => {
    mockHasPermission.mockReturnValue(false);
    renderCreateForm();
    expect(screen.queryByRole('form')).toBeNull();
    expect(screen.queryByLabelText(/nombre/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /crear estudiante/i })).toBeNull();
  });
});
