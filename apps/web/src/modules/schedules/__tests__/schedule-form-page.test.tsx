import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ScheduleFormPage } from '../pages/ScheduleFormPage';
import { queryClient } from '@/api/query-client';

const mockNavigate = vi.fn();
const mockUseCreateSchedule = vi.fn();
const mockUseSchedule = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({}) };
});

vi.mock('../hooks', () => ({
  useSchedule: (...args: unknown[]) => mockUseSchedule(...args),
  useCreateSchedule: () => mockUseCreateSchedule(),
  useUpdateSchedule: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
  useScheduleBlocks: vi.fn().mockReturnValue({ data: { data: [], meta: { total: 0 } }, isLoading: false }),
  useClassrooms: vi.fn().mockReturnValue({ data: { data: [], meta: { total: 0 } }, isLoading: false }),
}));

vi.mock('@/modules/courses/hooks', () => ({
  useCourses: vi.fn().mockReturnValue({
    data: { data: [{ id: 'cou-1', code: 'MAT-001', name: 'Matemáticas' }], meta: { total: 1 } },
    isLoading: false,
  }),
}));

vi.mock('@/modules/subjects/hooks', () => ({
  useSubjects: vi.fn().mockReturnValue({
    data: { data: [{ id: 'sub-1', code: 'ALG-S', name: 'Álgebra' }], meta: { total: 1 } },
    isLoading: false,
  }),
}));

vi.mock('@/modules/academic-periods/hooks', () => ({
  useAcademicPeriods: vi.fn().mockReturnValue({
    data: { data: [{ id: 'ap-1', code: '2026-P1', name: '2026 Primer Periodo' }], meta: { total: 1 } },
    isLoading: false,
  }),
}));

vi.mock('@/modules/teacher-assignments/hooks', () => ({
  useUsers: vi.fn().mockReturnValue({
    data: { data: [{ id: 'usr-1', firstName: 'Ana', lastName: 'Pérez' }], meta: { total: 1 } },
    isLoading: false,
  }),
}));

vi.mock('@/api/errors', () => ({
  getErrorMessage: (err: unknown) => {
    if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
    return 'Ocurrió un error inesperado';
  },
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
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    permissionCodes: ['schedules:read', 'schedules:manage'],
  }),
}));

function renderCreateForm() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/schedules/new']}>
        <ScheduleFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ScheduleFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSchedule.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mockUseCreateSchedule.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders create form', () => {
    renderCreateForm();
    expect(screen.getByText('Nuevo horario')).toBeDefined();
    expect(screen.getByLabelText(/hora de inicio/i)).toBeDefined();
    expect(screen.getByLabelText(/hora de fin/i)).toBeDefined();
  });

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup();
    renderCreateForm();

    await user.click(screen.getByRole('button', { name: /crear horario/i }));

    await waitFor(() => {
      expect(screen.getByText(/el curso es requerido/i)).toBeDefined();
      expect(screen.getByText(/la asignatura es requerida/i)).toBeDefined();
    });
  });

  it('creates schedule on valid submit', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'new-id',
      courseId: 'cou-1',
      subjectId: 'sub-1',
      dayOfWeek: 'MONDAY',
      startTime: '08:00',
      endTime: '09:30',
      classroom: 'Aula 101',
      status: 'ACTIVE',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
    mockUseCreateSchedule.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    renderCreateForm();

    await user.selectOptions(screen.getByLabelText(/curso/i), 'cou-1');
    await user.selectOptions(screen.getByLabelText(/asignatura/i), 'sub-1');
    await user.selectOptions(screen.getByLabelText(/periodo académico/i), 'ap-1');
    await user.click(screen.getByRole('button', { name: /crear horario/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/schedules/new-id');
    });
  });
});
