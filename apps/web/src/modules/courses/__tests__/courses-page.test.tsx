import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CoursesPage } from '../pages/CoursesPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseCourses = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../hooks', () => ({
  useCourses: (...args: unknown[]) => mockUseCourses(...args),
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
    hasPermission: (code: string) => code === 'courses:read' || code === 'courses:manage',
    hasAnyPermission: (...codes: string[]) => codes.some((c) => c === 'courses:read' || c === 'courses:manage'),
    hasAllPermissions: () => true,
    permissionCodes: ['courses:read', 'courses:manage'],
  }),
}));

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/courses']}>
        <CoursesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CoursesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', async () => {
    mockUseCourses.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText('Cursos')).toBeDefined();
  });

  it('shows empty state when no courses', async () => {
    mockUseCourses.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText(/no hay cursos/i)).toBeDefined();
  });

  it('shows create button when user has manage permission', async () => {
    mockUseCourses.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    const buttons = screen.getAllByText(/nuevo curso/i);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders course list', async () => {
    mockUseCourses.mockReturnValue({
      data: {
        data: [
          {
            id: 'c1',
            code: 'MAT-001',
            name: 'Matematicas',
            description: 'Curso de matematicas',
            status: 'ACTIVE',
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
    expect(screen.getAllByText(/matematicas/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/MAT-001/i).length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to detail on click', async () => {
    const user = userEvent.setup();
    mockUseCourses.mockReturnValue({
      data: {
        data: [
          {
            id: 'c1',
            code: 'MAT-001',
            name: 'Matematicas',
            description: null,
            status: 'ACTIVE',
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
    expect(mockNavigate).toHaveBeenCalledWith('/courses/c1');
  });
});
