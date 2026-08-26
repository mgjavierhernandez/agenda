import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CourseFormPage } from '../pages/CourseFormPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseCreateCourse = vi.fn();
const mockUseCourse = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({}) };
});

vi.mock('../hooks', () => ({
  useCourse: (...args: unknown[]) => mockUseCourse(...args),
  useCreateCourse: () => mockUseCreateCourse(),
  useUpdateCourse: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
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
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    permissionCodes: ['courses:read', 'courses:manage'],
  }),
}));

function renderCreateForm() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/courses/new']}>
        <CourseFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CourseFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCourse.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mockUseCreateCourse.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders create form', () => {
    renderCreateForm();
    expect(screen.getByText('Nuevo curso')).toBeDefined();
    expect(screen.getByLabelText(/código/i)).toBeDefined();
    expect(screen.getByLabelText(/nombre/i)).toBeDefined();
  });

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup();
    renderCreateForm();

    await user.click(screen.getByRole('button', { name: /crear curso/i }));

    await waitFor(() => {
      expect(screen.getByText(/el código es requerido/i)).toBeDefined();
      expect(screen.getByText(/el nombre es requerido/i)).toBeDefined();
    });
  });

  it('creates course on valid submit', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'new-id',
      code: 'MAT-002',
      name: 'Matematicas II',
      description: null,
      status: 'ACTIVE',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
    mockUseCreateCourse.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    renderCreateForm();

    await user.type(screen.getByLabelText(/código/i), 'MAT-002');
    await user.type(screen.getByLabelText(/nombre/i), 'Matematicas II');
    await user.click(screen.getByRole('button', { name: /crear curso/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/courses/new-id');
    });
  });
});
