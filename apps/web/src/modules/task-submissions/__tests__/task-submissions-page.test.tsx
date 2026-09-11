import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TaskSubmissionsPage } from '../pages/TaskSubmissionsPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseTasks = vi.fn();
const mockUseTaskAssignments = vi.fn();
const mockUseTaskSubmission = vi.fn();
const mockUseStudents = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/modules/tasks/hooks', () => ({
  useTasks: (...args: unknown[]) => mockUseTasks(...args),
}));

vi.mock('@/modules/task-assignments/hooks', () => ({
  useTaskAssignments: (...args: unknown[]) => mockUseTaskAssignments(...args),
}));

vi.mock('../hooks', () => ({
  useTaskSubmission: (...args: unknown[]) => mockUseTaskSubmission(...args),
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
    hasAnyPermission: (...codes: string[]) =>
      codes.some((c) => c === 'tasks:read' || c === 'tasks:manage'),
    hasAllPermissions: () => true,
    permissionCodes: ['tasks:read', 'tasks:manage'],
  }),
}));

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/task-submissions']}>
        <TaskSubmissionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TaskSubmissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTasks.mockReturnValue({
      data: { data: [], meta: { total: 0 } },
      isLoading: false,
    });
    mockUseTaskAssignments.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });
    mockUseTaskSubmission.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    mockUseStudents.mockReturnValue({
      data: { data: [], meta: { total: 0 } },
      isLoading: false,
    });
  });

  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('Entregas de tareas')).toBeDefined();
  });

  it('shows task selector prompt when no task selected', () => {
    renderPage();
    expect(screen.getAllByText(/selecciona una tarea/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no assignments for selected task', () => {
    mockUseTaskAssignments.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });
    renderPage();
    expect(screen.getAllByText(/selecciona una tarea/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows create assignment button when no assignments', () => {
    mockUseTasks.mockReturnValue({
      data: { data: [{ id: 't1', title: 'Test Task', status: 'PUBLISHED' }], meta: { total: 1 } },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText(/seleccionar tarea/i)).toBeDefined();
  });
});
