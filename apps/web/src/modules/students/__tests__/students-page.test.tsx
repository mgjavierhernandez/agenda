import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { StudentsPage } from '../pages/StudentsPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseStudents = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../hooks', () => ({
  useStudents: (...args: unknown[]) => mockUseStudents(...args),
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
    hasPermission: (code: string) => code === 'students:read' || code === 'students:manage',
    hasAnyPermission: (...codes: string[]) => codes.some((c) => c === 'students:read' || c === 'students:manage'),
    hasAllPermissions: () => true,
    roles: [],
    permissionCodes: ['students:read', 'students:manage'],
  }),
}));

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/students']}>
        <StudentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StudentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', async () => {
    mockUseStudents.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText('Estudiantes')).toBeDefined();
  });

  it('shows empty state when no students', async () => {
    mockUseStudents.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText(/no hay estudiantes/i)).toBeDefined();
  });

  it('shows create button when user has manage permission', async () => {
    mockUseStudents.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    const buttons = screen.getAllByText(/nuevo estudiante/i);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders student list', async () => {
    mockUseStudents.mockReturnValue({
      data: {
        data: [
          {
            id: 's1',
            firstName: 'Juan',
            lastName: 'Pérez',
            documentType: 'DNI',
            documentNumber: '12345',
            dateOfBirth: '2010-01-15',
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
    expect(screen.getAllByText(/juan/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/pérez/i).length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to detail on click', async () => {
    const user = userEvent.setup();
    mockUseStudents.mockReturnValue({
      data: {
        data: [
          {
            id: 's1',
            firstName: 'Juan',
            lastName: 'Pérez',
            documentType: 'DNI',
            documentNumber: '12345',
            dateOfBirth: null,
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
    expect(mockNavigate).toHaveBeenCalledWith('/students/s1');
  });
});
