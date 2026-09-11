import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TaskDetailPage } from '../pages/TaskDetailPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseTask = vi.fn();
const mockUsePublishTask = vi.fn();
const mockUseCloseTask = vi.fn();
const mockUseDeactivateTask = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ id: 't1' }) };
});

vi.mock('../hooks', () => ({
  useTask: (...args: unknown[]) => mockUseTask(...args),
  usePublishTask: () => mockUsePublishTask(),
  useCloseTask: () => mockUseCloseTask(),
  useDeactivateTask: () => mockUseDeactivateTask(),
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
    permissionCodes: [],
  }),
}));

vi.mock('@/modules/files/hooks', () => ({
  useTaskAttachments: () => ({ data: [], isLoading: false }),
  useCreateTaskAttachment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const mockTask = {
  id: 't1',
  institutionId: 'inst-1',
  courseId: 'cou-1',
  subjectId: 'sub-1',
  title: 'Ejercicios de álgebra',
  description: 'Resolver ejercicios del capítulo 3',
  dueDate: '2024-06-15T23:59:00.000Z',
  status: 'DRAFT',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-15T12:00:00Z',
};

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tasks/t1']}>
        <TaskDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TaskDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePublishTask.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseCloseTask.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseDeactivateTask.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders task title', () => {
    mockUseTask.mockReturnValue({ data: mockTask, isLoading: false, error: null });
    renderPage();
    expect(screen.getAllByText('Ejercicios de álgebra').length).toBeGreaterThanOrEqual(1);
  });

  it('renders task description', () => {
    mockUseTask.mockReturnValue({ data: mockTask, isLoading: false, error: null });
    renderPage();
    expect(screen.getAllByText('Resolver ejercicios del capítulo 3').length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it('shows DRAFT status badge', () => {
    mockUseTask.mockReturnValue({ data: mockTask, isLoading: false, error: null });
    renderPage();
    expect(screen.getAllByText('Borrador').length).toBeGreaterThanOrEqual(1);
  });

  it('shows edit button for DRAFT tasks', () => {
    mockUseTask.mockReturnValue({ data: mockTask, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Editar')).toBeDefined();
  });

  it('shows publish button for DRAFT tasks', () => {
    mockUseTask.mockReturnValue({ data: mockTask, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Publicar')).toBeDefined();
  });

  it('hides edit button for PUBLISHED tasks', () => {
    mockUseTask.mockReturnValue({
      data: { ...mockTask, status: 'PUBLISHED' },
      isLoading: false,
      error: null,
    });
    renderPage();
    expect(screen.queryByText('Editar')).toBeNull();
  });

  it('shows close button for PUBLISHED tasks', () => {
    mockUseTask.mockReturnValue({
      data: { ...mockTask, status: 'PUBLISHED' },
      isLoading: false,
      error: null,
    });
    renderPage();
    expect(screen.getByText('Cerrar')).toBeDefined();
  });

  it('hides publish and close for CLOSED tasks', () => {
    mockUseTask.mockReturnValue({
      data: { ...mockTask, status: 'CLOSED' },
      isLoading: false,
      error: null,
    });
    renderPage();
    expect(screen.queryByText('Publicar')).toBeNull();
    expect(screen.queryByText('Cerrar')).toBeNull();
  });

  it('shows error state for 404', () => {
    mockUseTask.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { statusCode: 404, message: 'Task not found', timestamp: '', path: '' },
    });
    renderPage();
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
  });
});
