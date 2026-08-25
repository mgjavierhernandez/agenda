import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { StudentDetailPage } from '../pages/StudentDetailPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseStudent = vi.fn();
const mockUseDeactivateStudent = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ id: 's1' }) };
});

vi.mock('../hooks', () => ({
  useStudent: (...args: unknown[]) => mockUseStudent(...args),
  useDeactivateStudent: () => mockUseDeactivateStudent(),
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
    hasPermission: (code: string) => code === 'students:read' || code === 'students:manage',
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    roles: [],
    permissionCodes: ['students:read', 'students:manage'],
  }),
}));

const mockStudent = {
  id: 's1',
  firstName: 'Juan',
  lastName: 'Pérez',
  documentType: 'DNI',
  documentNumber: '12345',
  dateOfBirth: '2010-01-15',
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-15T12:00:00Z',
};

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/students/s1']}>
        <StudentDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StudentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeactivateStudent.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders student name', async () => {
    mockUseStudent.mockReturnValue({
      data: mockStudent,
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByRole('heading', { name: /juan pérez/i })).toBeDefined();
  });

  it('shows student document', async () => {
    mockUseStudent.mockReturnValue({
      data: mockStudent,
      isLoading: false,
      error: null,
    });

    renderPage();
    const elements = screen.getAllByText(/12345/);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows edit button when user has manage permission', async () => {
    mockUseStudent.mockReturnValue({
      data: mockStudent,
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText('Editar')).toBeDefined();
  });

  it('shows deactivate button for active students', async () => {
    mockUseStudent.mockReturnValue({
      data: mockStudent,
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText('Desactivar')).toBeDefined();
  });

  it('shows error state for 404', async () => {
    mockUseStudent.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { statusCode: 404, message: 'Student not found', timestamp: '', path: '' },
    });

    renderPage();
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
  });
});
