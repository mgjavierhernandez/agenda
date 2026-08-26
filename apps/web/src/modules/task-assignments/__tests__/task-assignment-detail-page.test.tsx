import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TaskAssignmentDetailPage } from '../pages/TaskAssignmentDetailPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseTaskAssignment = vi.fn();
const mockUseUpdateTaskAssignment = vi.fn();
const mockUseDeactivateTaskAssignment = vi.fn();
const mockUseTask = vi.fn();
const mockUseStudents = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ id: 'ta1' }) };
});

vi.mock('../hooks', () => ({
  useTaskAssignment: (...args: unknown[]) => mockUseTaskAssignment(...args),
  useUpdateTaskAssignment: () => mockUseUpdateTaskAssignment(),
  useDeactivateTaskAssignment: () => mockUseDeactivateTaskAssignment(),
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
    hasPermission: (code: string) => code === 'tasks:read' || code === 'tasks:manage',
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    permissionCodes: ['tasks:read', 'tasks:manage'],
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

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/task-assignments/ta1']}>
        <TaskAssignmentDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TaskAssignmentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUpdateTaskAssignment.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseDeactivateTaskAssignment.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseTask.mockReturnValue({
      data: { id: 't1', title: 'Ejercicios de álgebra' },
      isLoading: false,
    });
    mockUseStudents.mockReturnValue({
      data: { data: [{ id: 's1', firstName: 'Juan', lastName: 'Pérez' }], meta: { total: 1 } },
      isLoading: false,
    });
  });

  it('renders assignment status', () => {
    mockUseTaskAssignment.mockReturnValue({ data: mockAssignment, isLoading: false, error: null });
    renderPage();
    expect(screen.getAllByText('Asignada').length).toBeGreaterThanOrEqual(1);
  });

  it('renders task title', () => {
    mockUseTaskAssignment.mockReturnValue({ data: mockAssignment, isLoading: false, error: null });
    renderPage();
    expect(screen.getAllByText('Ejercicios de álgebra').length).toBeGreaterThanOrEqual(1);
  });

  it('renders student name', () => {
    mockUseTaskAssignment.mockReturnValue({ data: mockAssignment, isLoading: false, error: null });
    renderPage();
    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThanOrEqual(1);
  });

  it('shows complete button for ASSIGNED status', () => {
    mockUseTaskAssignment.mockReturnValue({ data: mockAssignment, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Marcar completada')).toBeDefined();
  });

  it('shows cancel button for ASSIGNED status', () => {
    mockUseTaskAssignment.mockReturnValue({ data: mockAssignment, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Cancelar asignación')).toBeDefined();
  });

  it('hides complete and cancel for COMPLETED status', () => {
    mockUseTaskAssignment.mockReturnValue({
      data: { ...mockAssignment, status: 'COMPLETED' },
      isLoading: false,
      error: null,
    });
    renderPage();
    expect(screen.queryByText('Marcar completada')).toBeNull();
    expect(screen.queryByText('Cancelar asignación')).toBeNull();
  });

  it('shows error state for 404', () => {
    mockUseTaskAssignment.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { statusCode: 404, message: 'Not found', timestamp: '', path: '' },
    });
    renderPage();
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
  });
});
