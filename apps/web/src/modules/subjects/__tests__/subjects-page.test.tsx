import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SubjectsPage } from '../pages/SubjectsPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseSubjects = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../hooks', () => ({
  useSubjects: (...args: unknown[]) => mockUseSubjects(...args),
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
    hasPermission: (code: string) => code === 'subjects:read' || code === 'subjects:manage',
    hasAnyPermission: (...codes: string[]) => codes.some((c) => c === 'subjects:read' || c === 'subjects:manage'),
    hasAllPermissions: () => true,
    permissionCodes: ['subjects:read', 'subjects:manage'],
  }),
}));

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/subjects']}>
        <SubjectsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SubjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', async () => {
    mockUseSubjects.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText('Asignaturas')).toBeDefined();
  });

  it('shows empty state when no subjects', async () => {
    mockUseSubjects.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText(/no hay asignaturas/i)).toBeDefined();
  });

  it('shows create button when user has manage permission', async () => {
    mockUseSubjects.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    const buttons = screen.getAllByText(/nueva asignatura/i);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders subject list', async () => {
    mockUseSubjects.mockReturnValue({
      data: {
        data: [
          {
            id: 's1',
            code: 'MAT-S',
            name: 'Matematicas',
            description: 'Asignatura de matematicas',
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
    expect(screen.getAllByText(/MAT-S/i).length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to detail on click', async () => {
    const user = userEvent.setup();
    mockUseSubjects.mockReturnValue({
      data: {
        data: [
          {
            id: 's1',
            code: 'MAT-S',
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
    expect(mockNavigate).toHaveBeenCalledWith('/subjects/s1');
  });
});
