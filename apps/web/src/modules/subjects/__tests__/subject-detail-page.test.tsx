import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SubjectDetailPage } from '../pages/SubjectDetailPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseSubject = vi.fn();
const mockUseDeactivateSubject = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ id: 's1' }) };
});

vi.mock('../hooks', () => ({
  useSubject: (...args: unknown[]) => mockUseSubject(...args),
  useDeactivateSubject: () => mockUseDeactivateSubject(),
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
    hasPermission: (code: string) => code === 'subjects:read' || code === 'subjects:manage',
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    roles: [],
    permissionCodes: ['subjects:read', 'subjects:manage'],
  }),
}));

const mockSubject = {
  id: 's1',
  code: 'MAT-S',
  name: 'Matematicas',
  description: 'Asignatura de matematicas',
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-15T12:00:00Z',
};

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/subjects/s1']}>
        <SubjectDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SubjectDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeactivateSubject.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders subject name', async () => {
    mockUseSubject.mockReturnValue({ data: mockSubject, isLoading: false, error: null });
    renderPage();
    expect(screen.getByRole('heading', { name: /matematicas/i })).toBeDefined();
  });

  it('shows subject code', async () => {
    mockUseSubject.mockReturnValue({ data: mockSubject, isLoading: false, error: null });
    renderPage();
    const elements = screen.getAllByText(/MAT-S/i);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows edit button when user has manage permission', async () => {
    mockUseSubject.mockReturnValue({ data: mockSubject, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Editar')).toBeDefined();
  });

  it('shows deactivate button for active subjects', async () => {
    mockUseSubject.mockReturnValue({ data: mockSubject, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Desactivar')).toBeDefined();
  });

  it('shows error state for 404', async () => {
    mockUseSubject.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { statusCode: 404, message: 'Subject not found', timestamp: '', path: '' },
    });
    renderPage();
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
  });
});
