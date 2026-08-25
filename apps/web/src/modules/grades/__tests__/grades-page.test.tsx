import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { GradesPage } from '../pages/GradesPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseGrades = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../hooks', () => ({
  useGrades: (...args: unknown[]) => mockUseGrades(...args),
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
    hasPermission: (code: string) => code === 'grades:read' || code === 'grades:manage',
    hasAnyPermission: (...codes: string[]) => codes.some((c) => c === 'grades:read' || c === 'grades:manage'),
    hasAllPermissions: () => true,
    roles: [],
    permissionCodes: ['grades:read', 'grades:manage'],
  }),
}));

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/grades']}>
        <GradesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('GradesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', async () => {
    mockUseGrades.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText('Calificaciones')).toBeDefined();
  });

  it('shows empty state when no grades', async () => {
    mockUseGrades.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText(/no hay calificaciones/i)).toBeDefined();
  });

  it('shows create button when user has manage permission', async () => {
    mockUseGrades.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    const buttons = screen.getAllByText(/nueva calificación/i);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders grade list', async () => {
    mockUseGrades.mockReturnValue({
      data: {
        data: [
          {
            id: 'g1',
            studentId: 'stu-1',
            courseId: 'cou-1',
            subjectId: 'sub-1',
            value: '4.25',
            period: 'Q1',
            evaluationType: 'Parcial',
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
    expect(screen.getAllByText('4.25').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Q1').length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to detail on click', async () => {
    const user = userEvent.setup();
    mockUseGrades.mockReturnValue({
      data: {
        data: [
          {
            id: 'g1',
            studentId: 'stu-1',
            courseId: 'cou-1',
            subjectId: 'sub-1',
            value: '3.50',
            period: 'Q2',
            evaluationType: null,
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
    expect(mockNavigate).toHaveBeenCalledWith('/grades/g1');
  });
});
