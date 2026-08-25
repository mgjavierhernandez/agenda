import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SchedulesPage } from '../pages/SchedulesPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseSchedules = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../hooks', () => ({
  useSchedules: (...args: unknown[]) => mockUseSchedules(...args),
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
    hasPermission: (code: string) => code === 'schedules:read' || code === 'schedules:manage',
    hasAnyPermission: (...codes: string[]) => codes.some((c) => c === 'schedules:read' || c === 'schedules:manage'),
    hasAllPermissions: () => true,
    roles: [],
    permissionCodes: ['schedules:read', 'schedules:manage'],
  }),
}));

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/schedules']}>
        <SchedulesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SchedulesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', async () => {
    mockUseSchedules.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText('Horarios')).toBeDefined();
  });

  it('shows empty state when no schedules', async () => {
    mockUseSchedules.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText(/no hay horarios/i)).toBeDefined();
  });

  it('shows create button when user has manage permission', async () => {
    mockUseSchedules.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });

    renderPage();
    const buttons = screen.getAllByText(/nuevo horario/i);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders schedule list', async () => {
    mockUseSchedules.mockReturnValue({
      data: {
        data: [
          {
            id: 's1',
            courseId: 'cou-1',
            subjectId: 'sub-1',
            dayOfWeek: 'MONDAY',
            startTime: '08:00',
            endTime: '09:30',
            classroom: 'Aula 101',
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
    expect(screen.getAllByText('Lunes').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('08:00').length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to detail on click', async () => {
    const user = userEvent.setup();
    mockUseSchedules.mockReturnValue({
      data: {
        data: [
          {
            id: 's1',
            courseId: 'cou-1',
            subjectId: 'sub-1',
            dayOfWeek: 'MONDAY',
            startTime: '08:00',
            endTime: '09:30',
            classroom: 'Aula 101',
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
    expect(mockNavigate).toHaveBeenCalledWith('/schedules/s1');
  });
});
