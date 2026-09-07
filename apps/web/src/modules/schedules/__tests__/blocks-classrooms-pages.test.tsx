import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { type ReactNode } from 'react';
import { ScheduleBlocksPage } from '../pages/ScheduleBlocksPage';
import { ClassroomsPage } from '../pages/ClassroomsPage';
import { apiClient } from '@/api/client';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/permissions/usePermissions', () => ({
  usePermissions: () => ({
    permissionCodes: ['schedules:manage', 'schedules:read'],
    isLoading: false,
    isError: false,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
  }),
}));

vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({ selectedInstitutionId: 'inst-1' }),
}));

const createWrapper = (entry = '/schedules/blocks') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[entry]}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

const emptyPage = { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } };

describe('ScheduleBlocksPage (GAP-6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue(emptyPage);
  });

  it('renders the blocks management page', async () => {
    render(<ScheduleBlocksPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Franjas horarias')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('No hay franjas configuradas')).toBeInTheDocument();
    });
  });

  it('creates a block', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ id: 'b-1' });

    render(<ScheduleBlocksPage />, { wrapper: createWrapper() });

    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Bloque 1' } });
    fireEvent.click(screen.getByText('Crear'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/schedule-blocks',
        expect.objectContaining({ name: 'Bloque 1', dayOfWeek: 'MONDAY' }),
      );
    });
  });
});

describe('ClassroomsPage (GAP-6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue(emptyPage);
  });

  it('renders the classrooms management page', async () => {
    render(<ClassroomsPage />, { wrapper: createWrapper('/schedules/classrooms') });

    expect(screen.getByText('Aulas y espacios')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('No hay aulas registradas')).toBeInTheDocument();
    });
  });

  it('creates a classroom', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ id: 'r-1' });

    render(<ClassroomsPage />, { wrapper: createWrapper('/schedules/classrooms') });

    fireEvent.change(screen.getByLabelText(/Código/), { target: { value: 'A-101' } });
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Aula 101' } });
    fireEvent.click(screen.getByText('Crear'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/classrooms',
        expect.objectContaining({ code: 'A-101', name: 'Aula 101' }),
      );
    });
  });
});
