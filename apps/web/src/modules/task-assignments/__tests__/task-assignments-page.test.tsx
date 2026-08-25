import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TaskAssignmentsPage } from '../pages/TaskAssignmentsPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseTaskAssignments = vi.fn();
const mockUseTasks = vi.fn();
const mockUseStudents = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../hooks', () => ({
  useTaskAssignments: (...args: unknown[]) => mockUseTaskAssignments(...args),
}));

vi.mock('@/modules/tasks/hooks', () => ({
  useTasks: (...args: unknown[]) => mockUseTasks(...args),
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
    hasAnyPermission: (...codes: string[]) => codes.some((c) => c === 'tasks:read' || c === 'tasks:manage'),
    hasAllPermissions: () => true,
    roles: [],
    permissionCodes: ['tasks:read', 'tasks:manage'],
  }),
}));

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/task-assignments']}>
        <TaskAssignmentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TaskAssignmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTasks.mockReturnValue({
      data: { data: [], meta: { total: 0 } },
      isLoading: false,
    });
    mockUseStudents.mockReturnValue({
      data: { data: [], meta: { total: 0 } },
      isLoading: false,
    });
  });

  it('renders page title', () => {
    mockUseTaskAssignments.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText('Asignaciones de Tareas')).toBeDefined();
  });

  it('shows empty state when no assignments', () => {
    mockUseTaskAssignments.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText(/no hay asignaciones/i)).toBeDefined();
  });

  it('shows create button when user has manage permission', () => {
    mockUseTaskAssignments.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    const buttons = screen.getAllByText(/nueva asignación/i);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders assignment list', () => {
    mockUseTaskAssignments.mockReturnValue({
      data: {
        data: [
          {
            id: 'ta1',
            institutionId: 'inst-1',
            taskId: 't1',
            studentId: 's1',
            enrollmentId: null,
            status: 'ASSIGNED',
            assignedAt: '2024-06-15T12:00:00.000Z',
            createdAt: '2024-06-15T12:00:00.000Z',
            updatedAt: '2024-06-15T12:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      error: null,
    });

    mockUseTasks.mockReturnValue({
      data: { data: [{ id: 't1', title: 'Ejercicios de álgebra' }], meta: { total: 1 } },
      isLoading: false,
    });

    mockUseStudents.mockReturnValue({
      data: { data: [{ id: 's1', firstName: 'Juan', lastName: 'Pérez' }], meta: { total: 1 } },
      isLoading: false,
    });

    renderPage();
    expect(screen.getAllByText('Ejercicios de álgebra').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Asignada').length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to detail on click', async () => {
    const user = userEvent.setup();
    mockUseTaskAssignments.mockReturnValue({
      data: {
        data: [
          {
            id: 'ta1',
            institutionId: 'inst-1',
            taskId: 't1',
            studentId: 's1',
            enrollmentId: null,
            status: 'ASSIGNED',
            assignedAt: '2024-06-15T12:00:00.000Z',
            createdAt: '2024-06-15T12:00:00.000Z',
            updatedAt: '2024-06-15T12:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      error: null,
    });

    renderPage();
    const verButtons = screen.getAllByText('Ver');
    await user.click(verButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/task-assignments/ta1');
  });
});
