import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TaskAssignmentFormPage } from '../pages/TaskAssignmentFormPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseCreateTaskAssignment = vi.fn();
const mockUseTasks = vi.fn();
const mockUseStudents = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../hooks', () => ({
  useCreateTaskAssignment: () => mockUseCreateTaskAssignment(),
}));

vi.mock('@/modules/tasks/hooks', () => ({
  useTasks: (...args: unknown[]) => mockUseTasks(...args),
}));

vi.mock('@/modules/students/hooks', () => ({
  useStudents: (...args: unknown[]) => mockUseStudents(...args),
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
      <MemoryRouter initialEntries={['/task-assignments/new']}>
        <TaskAssignmentFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TaskAssignmentFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateTaskAssignment.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseTasks.mockReturnValue({
      data: {
        data: [
          { id: 't1', title: 'Ejercicios de álgebra', status: 'PUBLISHED' },
          { id: 't2', title: 'Ensayo de historia', status: 'DRAFT' },
        ],
        meta: { total: 2 },
      },
      isLoading: false,
    });
    mockUseStudents.mockReturnValue({
      data: {
        data: [
          { id: 's1', firstName: 'Juan', lastName: 'Pérez', documentNumber: '12345' },
          { id: 's2', firstName: 'María', lastName: 'García', documentNumber: '67890' },
        ],
        meta: { total: 2 },
      },
      isLoading: false,
    });
  });

  it('renders create form', () => {
    renderCreateForm();
    expect(screen.getByText('Nueva asignación')).toBeDefined();
  });

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup();
    renderCreateForm();

    await user.click(screen.getByRole('button', { name: /crear asignación/i }));

    await waitFor(() => {
      expect(screen.getByText(/la tarea es requerida/i)).toBeDefined();
      expect(screen.getByText(/selecciona al menos un estudiante/i)).toBeDefined();
    });
  });

  it('creates assignment on valid submit', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue([
      { id: 'new-ta1', taskId: 't1', studentId: 's1', status: 'ASSIGNED' },
    ]);
    mockUseCreateTaskAssignment.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    renderCreateForm();

    await user.selectOptions(screen.getByLabelText(/tarea/i), 't1');
    await user.click(screen.getByLabelText(/Juan Pérez/i));
    await user.click(screen.getByRole('button', { name: /crear asignación/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/task-assignments/new-ta1');
    });
  });

  it('renders student list with checkboxes', () => {
    renderCreateForm();
    expect(screen.getByLabelText(/Juan Pérez/i)).toBeDefined();
    expect(screen.getByLabelText(/María García/i)).toBeDefined();
  });

  it('renders task dropdown', () => {
    renderCreateForm();
    expect(screen.getByText('Ejercicios de álgebra')).toBeDefined();
  });
});
