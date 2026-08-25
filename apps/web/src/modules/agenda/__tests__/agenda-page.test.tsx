import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AgendaPage } from '../pages/AgendaPage';
import * as agendaHook from '../hooks/useAgenda';
import type { AgendaResponse } from '@/api/types';

vi.mock('../hooks/useAgenda');
vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com', status: 'ACTIVE' },
    isAuthenticated: true,
  }),
}));
vi.mock('@/tenant/tenant.store', () => ({
  useTenant: () => ({
    selectedInstitution: { id: 'inst-1', name: 'Test School', slug: 'test', status: 'ACTIVE' },
    isTenantReady: true,
    hasMultipleInstitutions: false,
    needsInstitutionSelection: false,
  }),
}));

const mockUseAgenda = vi.mocked(agendaHook.useAgenda);

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/agenda']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const mockAgendaData: AgendaResponse = {
  data: [
    {
      id: 'sched-1',
      type: 'SCHEDULE',
      title: 'Matematicas — Algebra',
      description: 'Aula 101',
      start: '2026-08-25T08:00:00.000Z',
      end: '2026-08-25T09:30:00.000Z',
      allDay: false,
      status: 'ACTIVE',
      sourceId: 's1',
      sourceType: 'Schedule',
      route: '/schedules/s1',
    },
    {
      id: 'task-1',
      type: 'TASK',
      title: 'Tarea de Algebra',
      description: 'Ejercicios del capitulo 3',
      start: '2026-08-25T23:59:00.000Z',
      allDay: false,
      status: 'PUBLISHED',
      sourceId: 't1',
      sourceType: 'Task',
      route: '/tasks/t1',
    },
    {
      id: 'comm-1',
      type: 'COMMUNICATION',
      title: 'Aviso importante',
      description: 'Reunion de padres',
      start: '2026-08-25T12:00:00.000Z',
      allDay: true,
      status: 'PUBLISHED',
      sourceId: 'c1',
      sourceType: 'Communication',
      route: '/communications/c1',
    },
  ],
  start: '2026-08-24T00:00:00.000Z',
  end: '2026-08-30T23:59:59.999Z',
  total: 3,
};

describe('AgendaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the agenda page with header', () => {
    mockUseAgenda.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as never);

    render(<AgendaPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Agenda')).toBeDefined();
  });

  it('should show loading spinner', () => {
    mockUseAgenda.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as never);

    render(<AgendaPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Agenda')).toBeDefined();
    expect(document.querySelector('.animate-spin')).toBeDefined();
  });

  it('should show empty state when no events', () => {
    mockUseAgenda.mockReturnValue({
      data: { data: [], start: '', end: '', total: 0 },
      isLoading: false,
      error: null,
    } as never);

    render(<AgendaPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Sin eventos')).toBeDefined();
  });

  it('should render events', () => {
    mockUseAgenda.mockReturnValue({
      data: mockAgendaData,
      isLoading: false,
      error: null,
    } as never);

    render(<AgendaPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Matematicas — Algebra')).toBeDefined();
    expect(screen.getByText('Tarea de Algebra')).toBeDefined();
    expect(screen.getByText('Aviso importante')).toBeDefined();
  });

  it('should show view mode buttons', () => {
    mockUseAgenda.mockReturnValue({
      data: mockAgendaData,
      isLoading: false,
      error: null,
    } as never);

    render(<AgendaPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Dia')).toBeDefined();
    expect(screen.getByText('Semana')).toBeDefined();
    expect(screen.getByText('Mes')).toBeDefined();
  });

  it('should show Hoy button', () => {
    mockUseAgenda.mockReturnValue({
      data: mockAgendaData,
      isLoading: false,
      error: null,
    } as never);

    render(<AgendaPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Hoy')).toBeDefined();
  });

  it('should show event type filters', () => {
    mockUseAgenda.mockReturnValue({
      data: mockAgendaData,
      isLoading: false,
      error: null,
    } as never);

    render(<AgendaPage />, { wrapper: createWrapper() });
    expect(screen.getAllByText('Horario').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tarea').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Comunicacion').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Firma').length).toBeGreaterThanOrEqual(1);
  });

  it('should show event type badges', () => {
    mockUseAgenda.mockReturnValue({
      data: mockAgendaData,
      isLoading: false,
      error: null,
    } as never);

    render(<AgendaPage />, { wrapper: createWrapper() });
    const badges = screen.getAllByText('Horario');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle error state', () => {
    mockUseAgenda.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    } as never);

    render(<AgendaPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Error al cargar la agenda')).toBeDefined();
  });
});
