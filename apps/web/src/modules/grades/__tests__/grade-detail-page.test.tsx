import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { GradeDetailPage } from '../pages/GradeDetailPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseGrade = vi.fn();
const mockUseDeactivateGrade = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ id: 'g1' }) };
});

vi.mock('../hooks', () => ({
  useGrade: (...args: unknown[]) => mockUseGrade(...args),
  useDeactivateGrade: () => mockUseDeactivateGrade(),
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
    hasPermission: (code: string) => code === 'grades:read' || code === 'grades:manage',
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    permissionCodes: ['grades:read', 'grades:manage'],
  }),
}));

const mockGrade = {
  id: 'g1',
  studentId: 'stu-1',
  courseId: 'cou-1',
  subjectId: 'sub-1',
  value: '4.25',
  period: 'Q1',
  evaluationType: 'Parcial',
  description: 'Examen parcial de matemáticas',
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-15T12:00:00Z',
};

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/grades/g1']}>
        <GradeDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('GradeDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeactivateGrade.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders grade value', async () => {
    mockUseGrade.mockReturnValue({ data: mockGrade, isLoading: false, error: null });
    renderPage();
    expect(screen.getByRole('heading', { name: /4\.25/i })).toBeDefined();
  });

  it('shows grade period', async () => {
    mockUseGrade.mockReturnValue({ data: mockGrade, isLoading: false, error: null });
    renderPage();
    const elements = screen.getAllByText('Q1');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows edit button when user has manage permission', async () => {
    mockUseGrade.mockReturnValue({ data: mockGrade, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Editar')).toBeDefined();
  });

  it('shows deactivate button for active grades', async () => {
    mockUseGrade.mockReturnValue({ data: mockGrade, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Desactivar')).toBeDefined();
  });

  it('shows error state for 404', async () => {
    mockUseGrade.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { statusCode: 404, message: 'Grade not found', timestamp: '', path: '' },
    });
    renderPage();
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
  });
});
