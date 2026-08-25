import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TaskSubmissionDetailPage } from '../pages/TaskSubmissionDetailPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseTaskAssignment = vi.fn();
const mockUseTaskSubmission = vi.fn();
const mockUseTask = vi.fn();
const mockUseStudents = vi.fn();
const mockUseGradeTaskSubmission = vi.fn();
const mockUseUpdateTaskAssignment = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ id: 'ta1' }) };
});

vi.mock('@/modules/task-assignments/hooks', () => ({
  useTaskAssignment: (...args: unknown[]) => mockUseTaskAssignment(...args),
  useUpdateTaskAssignment: () => mockUseUpdateTaskAssignment(),
}));

vi.mock('../hooks', () => ({
  useTaskSubmission: (...args: unknown[]) => mockUseTaskSubmission(...args),
  useGradeTaskSubmission: () => mockUseGradeTaskSubmission(),
}));

vi.mock('@/modules/tasks/hooks', () => ({
  useTask: (...args: unknown[]) => mockUseTask(...args),
}));

vi.mock('@/modules/students/hooks', () => ({
  useStudents: (...args: unknown[]) => mockUseStudents(...args),
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
    hasPermission: (code: string) => code === 'tasks:read' || code === 'tasks:manage' || code === 'grades:manage',
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    roles: [],
    permissionCodes: ['tasks:read', 'tasks:manage', 'grades:manage'],
  }),
}));

vi.mock('@/api/errors', () => ({
  getErrorMessage: (err: unknown) => {
    if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
    return 'Ocurrió un error inesperado';
  },
  getRequestId: () => null,
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

const mockSubmission = {
  id: 'sub1',
  institutionId: 'inst-1',
  taskAssignmentId: 'ta1',
  studentId: 's1',
  status: 'SUBMITTED',
  content: 'Mi entrega de prueba',
  grade: null,
  feedback: null,
  submittedAt: '2024-06-16T12:00:00.000Z',
  gradedAt: null,
  createdAt: '2024-06-16T12:00:00.000Z',
  updatedAt: '2024-06-16T12:00:00.000Z',
};

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/task-submissions/ta1']}>
        <TaskSubmissionDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TaskSubmissionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGradeTaskSubmission.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseUpdateTaskAssignment.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseTask.mockReturnValue({
      data: { id: 't1', title: 'Ejercicios de álgebra', dueDate: '2024-06-20T23:59:00.000Z' },
      isLoading: false,
    });
    mockUseStudents.mockReturnValue({
      data: { data: [{ id: 's1', firstName: 'Juan', lastName: 'Pérez' }], meta: { total: 1 } },
      isLoading: false,
    });
  });

  it('renders submission status', () => {
    mockUseTaskAssignment.mockReturnValue({ data: mockAssignment, isLoading: false, error: null });
    mockUseTaskSubmission.mockReturnValue({ data: mockSubmission, isLoading: false, error: null });
    renderPage();
    expect(screen.getAllByText('Entregada').length).toBeGreaterThanOrEqual(1);
  });

  it('renders submission content', () => {
    mockUseTaskAssignment.mockReturnValue({ data: mockAssignment, isLoading: false, error: null });
    mockUseTaskSubmission.mockReturnValue({ data: mockSubmission, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Mi entrega de prueba')).toBeDefined();
  });

  it('renders task title', () => {
    mockUseTaskAssignment.mockReturnValue({ data: mockAssignment, isLoading: false, error: null });
    mockUseTaskSubmission.mockReturnValue({ data: mockSubmission, isLoading: false, error: null });
    renderPage();
    expect(screen.getAllByText('Ejercicios de álgebra').length).toBeGreaterThanOrEqual(1);
  });

  it('renders student name', () => {
    mockUseTaskAssignment.mockReturnValue({ data: mockAssignment, isLoading: false, error: null });
    mockUseTaskSubmission.mockReturnValue({ data: mockSubmission, isLoading: false, error: null });
    renderPage();
    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThanOrEqual(1);
  });

  it('shows grade button for teacher', () => {
    mockUseTaskAssignment.mockReturnValue({ data: mockAssignment, isLoading: false, error: null });
    mockUseTaskSubmission.mockReturnValue({ data: mockSubmission, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Calificar')).toBeDefined();
  });

  it('shows no submission message when submission missing', () => {
    mockUseTaskAssignment.mockReturnValue({ data: mockAssignment, isLoading: false, error: null });
    mockUseTaskSubmission.mockReturnValue({ data: undefined, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText(/no entregada/i)).toBeDefined();
  });

  it('shows error state for 404', () => {
    mockUseTaskAssignment.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { statusCode: 404, message: 'Not found', timestamp: '', path: '' },
    });
    mockUseTaskSubmission.mockReturnValue({ data: undefined, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText(/not found/i)).toBeDefined();
  });

  it('renders submission date', () => {
    mockUseTaskAssignment.mockReturnValue({ data: mockAssignment, isLoading: false, error: null });
    mockUseTaskSubmission.mockReturnValue({ data: mockSubmission, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText(/16\/6\/2024/i)).toBeDefined();
  });
});
