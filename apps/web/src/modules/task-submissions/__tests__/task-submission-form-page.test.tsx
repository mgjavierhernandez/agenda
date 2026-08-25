import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TaskSubmissionFormPage } from '../pages/TaskSubmissionFormPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseTaskAssignment = vi.fn();
const mockUseTaskSubmission = vi.fn();
const mockUseTask = vi.fn();
const mockUseCreateTaskSubmission = vi.fn();
const mockUseUpdateTaskSubmission = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ id: 'ta1' }) };
});

vi.mock('@/modules/task-assignments/hooks', () => ({
  useTaskAssignment: (...args: unknown[]) => mockUseTaskAssignment(...args),
}));

vi.mock('../hooks', () => ({
  useTaskSubmission: (...args: unknown[]) => mockUseTaskSubmission(...args),
  useCreateTaskSubmission: () => mockUseCreateTaskSubmission(),
  useUpdateTaskSubmission: () => mockUseUpdateTaskSubmission(),
}));

vi.mock('@/modules/tasks/hooks', () => ({
  useTask: (...args: unknown[]) => mockUseTask(...args),
}));

vi.mock('@/api/errors', () => ({
  getErrorMessage: (err: unknown) => {
    if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
    return 'Ocurrió un error inesperado';
  },
}));

vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'student@test.com', status: 'ACTIVE' },
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
    permissionCodes: ['tasks:read', 'tasks:update'],
  }),
}));

const mockAssignment = {
  id: 'ta1',
  institutionId: 'inst-1',
  taskId: 't1',
  studentId: 's1',
  enrollmentId: null,
  status: 'ASSIGNED',
  assignedAt: '2024-06-15T12:00:00.000Z',
  createdAt: '2024-06-15T12:00:00.000Z',
  updatedAt: '2024-06-15T12:00:00.000Z',
};

function renderCreateForm() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/task-submissions/ta1/new']}>
        <TaskSubmissionFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderUpdateForm() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/task-submissions/ta1/new']}>
        <TaskSubmissionFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TaskSubmissionFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTaskAssignment.mockReturnValue({ data: mockAssignment, isLoading: false, error: null });
    mockUseTaskSubmission.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mockUseTask.mockReturnValue({
      data: { id: 't1', title: 'Ejercicios de álgebra', dueDate: '2024-06-20T23:59:00.000Z' },
      isLoading: false,
    });
    mockUseCreateTaskSubmission.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseUpdateTaskSubmission.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders create form', () => {
    renderCreateForm();
    expect(screen.getByText('Nueva entrega')).toBeDefined();
  });

  it('renders task title', () => {
    renderCreateForm();
    expect(screen.getByText('Ejercicios de álgebra')).toBeDefined();
  });

  it('renders content textarea', () => {
    renderCreateForm();
    expect(screen.getByPlaceholderText(/escribe o pega/i)).toBeDefined();
  });

  it('creates submission on valid submit', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'sub1',
      taskAssignmentId: 'ta1',
      status: 'SUBMITTED',
    });
    mockUseCreateTaskSubmission.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    renderCreateForm();

    await user.type(screen.getByPlaceholderText(/escribe o pega/i), 'Mi entrega');
    await user.click(screen.getByRole('button', { name: /enviar entrega/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/task-assignments/ta1');
    });
  });

  it('shows update form when submission exists', () => {
    mockUseTaskSubmission.mockReturnValue({
      data: {
        id: 'sub1',
        taskAssignmentId: 'ta1',
        status: 'SUBMITTED',
        content: 'Contenido existente',
      },
      isLoading: false,
      error: null,
    });
    renderUpdateForm();
    expect(screen.getAllByText(/actualizar entrega/i).length).toBeGreaterThanOrEqual(1);
  });
});
