import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TaskFormPage } from '../pages/TaskFormPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseCreateTask = vi.fn();
const mockUseTask = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({}) };
});

vi.mock('../hooks', () => ({
  useTask: (...args: unknown[]) => mockUseTask(...args),
  useCreateTask: () => mockUseCreateTask(),
  useUpdateTask: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
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
    roles: [],
    permissionCodes: ['tasks:read', 'tasks:manage'],
  }),
}));

function renderCreateForm() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tasks/new']}>
        <TaskFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TaskFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTask.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mockUseCreateTask.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders create form', () => {
    renderCreateForm();
    expect(screen.getByText('Nueva tarea')).toBeDefined();
    expect(screen.getByLabelText(/título/i)).toBeDefined();
    expect(screen.getByLabelText(/fecha límite/i)).toBeDefined();
  });

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup();
    renderCreateForm();

    await user.click(screen.getByRole('button', { name: /crear tarea/i }));

    await waitFor(() => {
      expect(screen.getByText(/el título es requerido/i)).toBeDefined();
      expect(screen.getByText(/el curso es requerido/i)).toBeDefined();
      expect(screen.getByText(/la asignatura es requerida/i)).toBeDefined();
    });
  });

  it('creates task on valid submit', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'new-id',
      courseId: 'cou-1',
      subjectId: 'sub-1',
      title: 'Nueva tarea',
      description: null,
      dueDate: '2024-06-15T23:59:00.000Z',
      status: 'DRAFT',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
    mockUseCreateTask.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    renderCreateForm();

    await user.type(screen.getByLabelText(/título/i), 'Nueva tarea');
    await user.selectOptions(screen.getByLabelText(/curso/i), 'cou-1');
    await user.selectOptions(screen.getByLabelText(/asignatura/i), 'sub-1');
    await user.type(screen.getByLabelText(/fecha límite/i), '2024-06-15T23:59');
    await user.click(screen.getByRole('button', { name: /crear tarea/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/tasks/new-id');
    });
  });
});
