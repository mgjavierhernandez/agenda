import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { GradeFormPage } from '../pages/GradeFormPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseCreateGrade = vi.fn();
const mockUseGrade = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({}) };
});

vi.mock('../hooks', () => ({
  useGrade: (...args: unknown[]) => mockUseGrade(...args),
  useCreateGrade: () => mockUseCreateGrade(),
  useUpdateGrade: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/modules/students/hooks', () => ({
  useStudents: vi.fn().mockReturnValue({
    data: { data: [{ id: 'stu-1', firstName: 'Juan', lastName: 'Pérez' }], meta: { total: 1 } },
    isLoading: false,
  }),
}));

vi.mock('@/modules/courses/hooks', () => ({
  useCourses: vi.fn().mockReturnValue({
    data: { data: [{ id: 'cou-1', code: 'MAT-001', name: 'Matemáticas' }], meta: { total: 1 } },
    isLoading: false,
  }),
}));

vi.mock('@/modules/subjects/hooks', () => ({
  useSubjects: vi.fn().mockReturnValue({
    data: { data: [{ id: 'sub-1', code: 'ALG-S', name: 'Álgebra' }], meta: { total: 1 } },
    isLoading: false,
  }),
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
    permissionCodes: ['grades:read', 'grades:manage'],
  }),
}));

function renderCreateForm() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/grades/new']}>
        <GradeFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('GradeFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGrade.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mockUseCreateGrade.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders create form', () => {
    renderCreateForm();
    expect(screen.getByText('Nueva calificación')).toBeDefined();
    expect(screen.getByLabelText(/valor/i)).toBeDefined();
    expect(screen.getByLabelText(/período/i)).toBeDefined();
  });

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup();
    renderCreateForm();

    await user.click(screen.getByRole('button', { name: /crear calificación/i }));

    await waitFor(() => {
      expect(screen.getByText(/el valor es requerido/i)).toBeDefined();
      expect(screen.getByText(/el período es requerido/i)).toBeDefined();
    });
  });

  it('creates grade on valid submit', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'new-id',
      studentId: 'stu-1',
      courseId: 'cou-1',
      subjectId: 'sub-1',
      value: '4.25',
      period: 'Q1',
      evaluationType: null,
      description: null,
      status: 'ACTIVE',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
    mockUseCreateGrade.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    renderCreateForm();

    await user.selectOptions(screen.getByLabelText(/estudiante/i), 'stu-1');
    await user.selectOptions(screen.getByLabelText(/curso/i), 'cou-1');
    await user.selectOptions(screen.getByLabelText(/asignatura/i), 'sub-1');
    await user.type(screen.getByLabelText(/valor/i), '4.25');
    await user.type(screen.getByLabelText(/período/i), 'Q1');
    await user.click(screen.getByRole('button', { name: /crear calificación/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/grades/new-id');
    });
  });
});
