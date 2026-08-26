import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TasksPage } from '../pages/TasksPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseTasks = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../hooks', () => ({
  useTasks: (...args: unknown[]) => mockUseTasks(...args),
}));

vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'admin@test.com', status: 'ACTIVE' },
    selectedInstitutionId: 'inst-1',
    isAuthenticated: true,
    isInitializing: false,
    institutions: [{ id: 'inst-1', name: 'Test School', slug: 'test', status: 'ACTIVE' }],
  }),
}));

vi.mock('@/permissions/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (code: string) => code === 'tasks:read' || code === 'tasks:manage',
    hasAnyPermission: (...codes: string[]) => codes.some((c) => c === 'tasks:read' || c === 'tasks:manage'),
    hasAllPermissions: () => true,
    permissionCodes: ['tasks:read', 'tasks:manage'],
  }),
}));

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tasks']}>
        <TasksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', () => {
    mockUseTasks.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText('Tareas')).toBeDefined();
  });

  it('shows empty state when no tasks', () => {
    mockUseTasks.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText(/no hay tareas/i)).toBeDefined();
  });

  it('shows create button when user has manage permission', () => {
    mockUseTasks.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    const buttons = screen.getAllByText(/nueva tarea/i);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders task list', () => {
    mockUseTasks.mockReturnValue({
      data: {
        data: [
          {
            id: 't1',
            courseId: 'cou-1',
            subjectId: 'sub-1',
            title: 'Ejercicios de álgebra',
            description: 'Resolver ejercicios del capítulo 3',
            dueDate: '2024-06-15T23:59:00.000Z',
            status: 'DRAFT',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getAllByText('Ejercicios de álgebra').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Borrador').length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to detail on click', async () => {
    const user = userEvent.setup();
    mockUseTasks.mockReturnValue({
      data: {
        data: [
          {
            id: 't1',
            courseId: 'cou-1',
            subjectId: 'sub-1',
            title: 'Tarea de prueba',
            description: null,
            dueDate: '2024-06-15T23:59:00.000Z',
            status: 'PUBLISHED',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
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
    expect(mockNavigate).toHaveBeenCalledWith('/tasks/t1');
  });
});
