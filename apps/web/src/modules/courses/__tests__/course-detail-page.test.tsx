import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CourseDetailPage } from '../pages/CourseDetailPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseCourse = vi.fn();
const mockUseDeactivateCourse = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ id: 'c1' }) };
});

vi.mock('../hooks', () => ({
  useCourse: (...args: unknown[]) => mockUseCourse(...args),
  useDeactivateCourse: () => mockUseDeactivateCourse(),
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
    hasPermission: (code: string) => code === 'courses:read' || code === 'courses:manage',
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    roles: [],
    permissionCodes: ['courses:read', 'courses:manage'],
  }),
}));

const mockCourse = {
  id: 'c1',
  code: 'MAT-001',
  name: 'Matematicas',
  description: 'Curso de matematicas',
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-15T12:00:00Z',
};

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/courses/c1']}>
        <CourseDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CourseDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeactivateCourse.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders course name', async () => {
    mockUseCourse.mockReturnValue({ data: mockCourse, isLoading: false, error: null });
    renderPage();
    expect(screen.getByRole('heading', { name: /matematicas/i })).toBeDefined();
  });

  it('shows course code', async () => {
    mockUseCourse.mockReturnValue({ data: mockCourse, isLoading: false, error: null });
    renderPage();
    const elements = screen.getAllByText(/MAT-001/i);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows edit button when user has manage permission', async () => {
    mockUseCourse.mockReturnValue({ data: mockCourse, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Editar')).toBeDefined();
  });

  it('shows deactivate button for active courses', async () => {
    mockUseCourse.mockReturnValue({ data: mockCourse, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Desactivar')).toBeDefined();
  });

  it('shows error state for 404', async () => {
    mockUseCourse.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { statusCode: 404, message: 'Course not found', timestamp: '', path: '' },
    });
    renderPage();
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
  });
});
