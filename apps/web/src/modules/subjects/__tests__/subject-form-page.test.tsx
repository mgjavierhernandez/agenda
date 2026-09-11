import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SubjectFormPage } from '../pages/SubjectFormPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseCreateSubject = vi.fn();
const mockUseSubject = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({}) };
});

vi.mock('../hooks', () => ({
  useSubject: (...args: unknown[]) => mockUseSubject(...args),
  useCreateSubject: () => mockUseCreateSubject(),
  useUpdateSubject: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/modules/areas/hooks/useAreas', () => ({
  useAreas: () => ({ data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } } }),
}));

vi.mock('@/api/errors', () => ({
  getErrorMessage: (err: unknown) => {
    if (err && typeof err === 'object' && 'message' in err)
      return String((err as { message: unknown }).message);
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
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    permissionCodes: ['subjects:read', 'subjects:manage'],
  }),
}));

function renderCreateForm() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/subjects/new']}>
        <SubjectFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SubjectFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSubject.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mockUseCreateSubject.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders create form', () => {
    renderCreateForm();
    expect(screen.getByText('Nueva asignatura')).toBeDefined();
    expect(screen.getByLabelText(/código/i)).toBeDefined();
    expect(screen.getByLabelText(/nombre/i)).toBeDefined();
  });

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup();
    renderCreateForm();

    await user.click(screen.getByRole('button', { name: /crear asignatura/i }));

    await waitFor(() => {
      expect(screen.getByText(/el código es requerido/i)).toBeDefined();
      expect(screen.getByText(/el nombre es requerido/i)).toBeDefined();
    });
  });

  it('creates subject on valid submit', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'new-id',
      code: 'FIS-S',
      name: 'Fisica',
      description: null,
      status: 'ACTIVE',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
    mockUseCreateSubject.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    renderCreateForm();

    await user.type(screen.getByLabelText(/código/i), 'FIS-S');
    await user.type(screen.getByLabelText(/nombre/i), 'Fisica');
    await user.click(screen.getByRole('button', { name: /crear asignatura/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/subjects/new-id');
    });
  });
});
