import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ScheduleDetailPage } from '../pages/ScheduleDetailPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseSchedule = vi.fn();
const mockUseDeactivateSchedule = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ id: 's1' }) };
});

vi.mock('../hooks', () => ({
  useSchedule: (...args: unknown[]) => mockUseSchedule(...args),
  useDeactivateSchedule: () => mockUseDeactivateSchedule(),
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
    hasPermission: (code: string) => code === 'schedules:read' || code === 'schedules:manage',
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    permissionCodes: ['schedules:read', 'schedules:manage'],
  }),
}));

const mockSchedule = {
  id: 's1',
  institutionId: 'inst-1',
  courseId: 'cou-1',
  subjectId: 'sub-1',
  academicPeriodId: 'ap-1',
  teacherUserId: 'usr-1',
  classroomId: 'room-1',
  blockId: 'blk-1',
  dayOfWeek: 'MONDAY',
  startTime: '08:00',
  endTime: '09:30',
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-15T12:00:00Z',
};

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/schedules/s1']}>
        <ScheduleDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ScheduleDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeactivateSchedule.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders schedule day', async () => {
    mockUseSchedule.mockReturnValue({ data: mockSchedule, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Lunes')).toBeDefined();
  });

  it('shows schedule times', async () => {
    mockUseSchedule.mockReturnValue({ data: mockSchedule, isLoading: false, error: null });
    renderPage();
    const elements = screen.getAllByText('08:00');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows classroom', async () => {
    mockUseSchedule.mockReturnValue({ data: mockSchedule, isLoading: false, error: null });
    renderPage();
    const elements = screen.getAllByText('room-1');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows edit button when user has manage permission', async () => {
    mockUseSchedule.mockReturnValue({ data: mockSchedule, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Editar')).toBeDefined();
  });

  it('shows deactivate button for active schedules', async () => {
    mockUseSchedule.mockReturnValue({ data: mockSchedule, isLoading: false, error: null });
    renderPage();
    expect(screen.getByText('Desactivar')).toBeDefined();
  });

  it('shows error state for 404', async () => {
    mockUseSchedule.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { statusCode: 404, message: 'Schedule not found', timestamp: '', path: '' },
    });
    renderPage();
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
  });
});
