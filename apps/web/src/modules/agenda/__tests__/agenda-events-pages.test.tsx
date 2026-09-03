import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { AgendaEventFormPage } from '../pages/AgendaEventFormPage';
import { AgendaEventDetailPage } from '../pages/AgendaEventDetailPage';
import { apiClient } from '@/api/client';
import type { AgendaEventItem } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockHasPermission = vi.fn().mockReturnValue(true);
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/permissions/usePermissions', () => ({
  usePermissions: () => ({
    permissionCodes: [],
    isLoading: false,
    isError: false,
    hasPermission: mockHasPermission,
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
  }),
}));

vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com', firstName: 'Test', lastName: 'User' },
  }),
}));

let mockParams: Record<string, string> = {};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
  };
});

const mockEvent: AgendaEventItem = {
  id: 'ev-1',
  institutionId: 'inst-1',
  createdById: 'user-1',
  title: 'Reunion de padres',
  description: 'Convocatoria general',
  startAt: '2026-09-10T14:00:00.000Z',
  endAt: '2026-09-10T16:00:00.000Z',
  location: 'Salon de actos',
  audience: 'PARENTS',
  status: 'ACTIVE',
  createdAt: '2026-08-30T10:00:00.000Z',
  updatedAt: '2026-08-30T10:00:00.000Z',
  createdBy: { id: 'user-1', firstName: 'Test', lastName: 'User' },
};

const createWrapper = (initialEntries?: string[]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

const setInputValue = (element: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  if (setter) {
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
};

describe('AgendaEventFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockNavigate.mockReset();
    mockParams = {};
  });

  it('renders create form', () => {
    render(<AgendaEventFormPage />, { wrapper: createWrapper(['/agenda/events/new']) });

    expect(screen.getByText('Nuevo evento')).toBeInTheDocument();
    expect(screen.getByText('Crear evento')).toBeInTheDocument();
  });

  it('renders form fields', () => {
    render(<AgendaEventFormPage />, { wrapper: createWrapper(['/agenda/events/new']) });

    expect(screen.getByLabelText('Título')).toBeInTheDocument();
    expect(screen.getByLabelText('Descripción')).toBeInTheDocument();
    expect(screen.getByLabelText('Ubicación')).toBeInTheDocument();
    expect(screen.getByLabelText('Audiencia')).toBeInTheDocument();
    expect(screen.getByLabelText('Inicio')).toBeInTheDocument();
    expect(screen.getByLabelText('Fin')).toBeInTheDocument();
  });

  it('validates required title', async () => {
    render(<AgendaEventFormPage />, { wrapper: createWrapper(['/agenda/events/new']) });

    screen.getByText('Crear evento').click();

    await waitFor(() => {
      expect(screen.getByText('El título es requerido')).toBeInTheDocument();
    });
  });

  it('validates date order', async () => {
    render(<AgendaEventFormPage />, { wrapper: createWrapper(['/agenda/events/new']) });

    setInputValue(screen.getByLabelText('Título') as HTMLInputElement, 'Reunion');
    setInputValue(screen.getByLabelText('Inicio') as HTMLInputElement, '2026-09-10T16:00');
    setInputValue(screen.getByLabelText('Fin') as HTMLInputElement, '2026-09-10T14:00');

    screen.getByText('Crear evento').click();

    await waitFor(() => {
      expect(
        screen.getByText('La fecha de fin debe ser posterior a la fecha de inicio'),
      ).toBeInTheDocument();
    });
  });

  it('creates an event and navigates to its detail page', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(mockEvent);

    render(<AgendaEventFormPage />, { wrapper: createWrapper(['/agenda/events/new']) });

    setInputValue(screen.getByLabelText('Título') as HTMLInputElement, 'Reunion de padres');
    setInputValue(screen.getByLabelText('Ubicación') as HTMLInputElement, 'Salon de actos');
    setInputValue(screen.getByLabelText('Inicio') as HTMLInputElement, '2026-09-10T14:00');
    setInputValue(screen.getByLabelText('Fin') as HTMLInputElement, '2026-09-10T16:00');

    screen.getByText('Crear evento').click();

    await waitFor(() => {
      expect(vi.mocked(apiClient.post)).toHaveBeenCalledWith('/agenda/events', {
        title: 'Reunion de padres',
        description: null,
        location: 'Salon de actos',
        audience: 'ALL',
        startAt: new Date('2026-09-10T14:00').toISOString(),
        endAt: new Date('2026-09-10T16:00').toISOString(),
      });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/agenda/events/ev-1');
    });
  });

  it('renders edit form with existing data and patches it', async () => {
    mockParams = { id: 'ev-1' };
    vi.mocked(apiClient.get).mockResolvedValue(mockEvent);
    vi.mocked(apiClient.patch).mockResolvedValue({ ...mockEvent, title: 'Reunion confirmada' });

    render(<AgendaEventFormPage />, { wrapper: createWrapper(['/agenda/events/ev-1/edit']) });

    await waitFor(() => {
      expect(screen.getByText('Editar evento')).toBeInTheDocument();
    });
    expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Reunion de padres');
    expect((screen.getByLabelText('Audiencia') as HTMLSelectElement).value).toBe('PARENTS');

    setInputValue(screen.getByLabelText('Título') as HTMLInputElement, 'Reunion confirmada');
    screen.getByText('Guardar cambios').click();

    await waitFor(() => {
      expect(vi.mocked(apiClient.patch)).toHaveBeenCalledWith('/agenda/events/ev-1', {
        title: 'Reunion confirmada',
        description: 'Convocatoria general',
        location: 'Salon de actos',
        audience: 'PARENTS',
        startAt: expect.any(String),
        endAt: expect.any(String),
      });
    });
  });

  it('blocks editing a cancelled event', async () => {
    mockParams = { id: 'ev-1' };
    vi.mocked(apiClient.get).mockResolvedValue({ ...mockEvent, status: 'CANCELLED' });

    render(<AgendaEventFormPage />, { wrapper: createWrapper(['/agenda/events/ev-1/edit']) });

    await waitFor(() => {
      expect(screen.getByText(/cancelado/)).toBeInTheDocument();
    });
  });

  it('hides form when user lacks permission', () => {
    mockHasPermission.mockReturnValue(false);

    render(<AgendaEventFormPage />, { wrapper: createWrapper(['/agenda/events/new']) });

    expect(screen.getByText(/No tienes permisos/)).toBeInTheDocument();
  });
});

describe('AgendaEventDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockNavigate.mockReset();
    mockParams = { id: 'ev-1' };
  });

  it('renders event details', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockEvent);

    render(<AgendaEventDetailPage />, { wrapper: createWrapper(['/agenda/events/ev-1']) });

    await waitFor(() => {
      expect(screen.getAllByText('Reunion de padres').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Salon de actos').length).toBeGreaterThan(0);
    expect(screen.getByText('Padres')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('shows edit and cancel buttons for permitted users on active events', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockEvent);

    render(<AgendaEventDetailPage />, { wrapper: createWrapper(['/agenda/events/ev-1']) });

    await waitFor(() => {
      expect(screen.getByText('Editar')).toBeInTheDocument();
      expect(screen.getByText('Cancelar evento')).toBeInTheDocument();
    });
  });

  it('hides edit/cancel buttons when permissions are missing', async () => {
    mockHasPermission.mockReturnValue(false);
    vi.mocked(apiClient.get).mockResolvedValue(mockEvent);

    render(<AgendaEventDetailPage />, { wrapper: createWrapper(['/agenda/events/ev-1']) });

    await waitFor(() => {
      expect(screen.getAllByText('Reunion de padres').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancelar evento')).not.toBeInTheDocument();
  });

  it('hides action buttons for cancelled events', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ ...mockEvent, status: 'CANCELLED' });

    render(<AgendaEventDetailPage />, { wrapper: createWrapper(['/agenda/events/ev-1']) });

    await waitFor(() => {
      expect(screen.getByText('Cancelado')).toBeInTheDocument();
    });
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancelar evento')).not.toBeInTheDocument();
  });

  it('cancels the event after confirmation and navigates back to the agenda', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockEvent);
    vi.mocked(apiClient.delete).mockResolvedValue({ ...mockEvent, status: 'CANCELLED' });

    render(<AgendaEventDetailPage />, { wrapper: createWrapper(['/agenda/events/ev-1']) });

    await waitFor(() => {
      expect(screen.getByText('Cancelar evento')).toBeInTheDocument();
    });

    screen.getByText('Cancelar evento').click();
    await waitFor(() => {
      expect(screen.getByText('Confirmar cancelación')).toBeInTheDocument();
    });

    const modalButtons = screen.getAllByText('Cancelar evento');
    modalButtons[modalButtons.length - 1].click();

    await waitFor(() => {
      expect(vi.mocked(apiClient.delete)).toHaveBeenCalledWith('/agenda/events/ev-1');
      expect(mockNavigate).toHaveBeenCalledWith('/agenda');
    });
  });

  it('renders 404 state when the event is not found', async () => {
    const notFoundError = Object.assign(new Error('Not Found'), { statusCode: 404 });
    vi.mocked(apiClient.get).mockRejectedValue(notFoundError);

    render(<AgendaEventDetailPage />, { wrapper: createWrapper(['/agenda/events/ev-1']) });

    await waitFor(() => {
      expect(screen.getByText(/Evento no encontrado|No encontrado|Not Found/)).toBeInTheDocument();
    });
  });
});