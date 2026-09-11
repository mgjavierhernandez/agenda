import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { AcademicPeriodsPage } from '../pages/AcademicPeriodsPage';
import { AcademicPeriodDetailPage } from '../pages/AcademicPeriodDetailPage';
import { AcademicPeriodFormPage } from '../pages/AcademicPeriodFormPage';
import { apiClient } from '@/api/client';
import type { AcademicPeriod, PaginatedApiResponse } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockHasPermission = vi.fn().mockReturnValue(true);

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
  };
});

const mockPeriod: AcademicPeriod = {
  id: 'ap-1',
  institutionId: 'inst-1',
  name: '2026 - Periodo 1',
  code: '2026-P1',
  startDate: '2026-01-15T12:00:00.000Z',
  endDate: '2026-06-30T12:00:00.000Z',
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
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

describe('AcademicPeriodsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('renders the page header', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    render(<AcademicPeriodsPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Periodos académicos')).toBeInTheDocument();
  });

  it('renders empty state when no periods', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    render(<AcademicPeriodsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No hay periodos académicos')).toBeInTheDocument();
    });
  });

  it('renders periods in a table', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockPeriod],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } as PaginatedApiResponse<AcademicPeriod>);

    render(<AcademicPeriodsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('2026 - Periodo 1').length).toBeGreaterThan(0);
    });
  });

  it('shows new period button for managers', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    render(<AcademicPeriodsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Nuevo periodo')).toBeInTheDocument();
    });
  });

  it('hides new period button for non-managers', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    mockHasPermission.mockImplementation((perm: string) => perm !== 'academic-periods:manage');

    render(<AcademicPeriodsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.queryByText('Nuevo periodo')).not.toBeInTheDocument();
    });
  });

  it('renders period code', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockPeriod],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } as PaginatedApiResponse<AcademicPeriod>);

    render(<AcademicPeriodsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('2026-P1').length).toBeGreaterThan(0);
    });
  });

  it('renders status badge', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockPeriod],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } as PaginatedApiResponse<AcademicPeriod>);

    render(<AcademicPeriodsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Activo').length).toBeGreaterThan(0);
    });
  });
});

describe('AcademicPeriodDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockParams = { id: 'ap-1' };
  });

  it('renders period details', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockPeriod);

    render(<AcademicPeriodDetailPage />, { wrapper: createWrapper(['/academic-periods/ap-1']) });

    await waitFor(() => {
      expect(screen.getAllByText('2026 - Periodo 1').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders period code', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockPeriod);

    render(<AcademicPeriodDetailPage />, { wrapper: createWrapper(['/academic-periods/ap-1']) });

    await waitFor(() => {
      expect(screen.getByText('2026-P1')).toBeInTheDocument();
    });
  });

  it('shows status badge', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockPeriod);

    render(<AcademicPeriodDetailPage />, { wrapper: createWrapper(['/academic-periods/ap-1']) });

    await waitFor(() => {
      expect(screen.getByText('Activo')).toBeInTheDocument();
    });
  });

  it('shows edit button for managers', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockPeriod);

    render(<AcademicPeriodDetailPage />, { wrapper: createWrapper(['/academic-periods/ap-1']) });

    await waitFor(() => {
      expect(screen.getByText('Editar')).toBeInTheDocument();
    });
  });

  it('shows deactivate button for active periods', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockPeriod);

    render(<AcademicPeriodDetailPage />, { wrapper: createWrapper(['/academic-periods/ap-1']) });

    await waitFor(() => {
      expect(screen.getByText('Desactivar')).toBeInTheDocument();
    });
  });

  it('hides deactivate button for inactive periods', async () => {
    const inactivePeriod = { ...mockPeriod, status: 'INACTIVE' as const };
    vi.mocked(apiClient.get).mockResolvedValue(inactivePeriod);

    render(<AcademicPeriodDetailPage />, { wrapper: createWrapper(['/academic-periods/ap-1']) });

    await waitFor(() => {
      expect(screen.queryByText('Desactivar')).not.toBeInTheDocument();
    });
  });

  it('hides edit/deactivate for non-managers', async () => {
    mockHasPermission.mockImplementation((perm: string) => perm !== 'academic-periods:manage');
    vi.mocked(apiClient.get).mockResolvedValue(mockPeriod);

    render(<AcademicPeriodDetailPage />, { wrapper: createWrapper(['/academic-periods/ap-1']) });

    await waitFor(() => {
      expect(screen.queryByText('Editar')).not.toBeInTheDocument();
      expect(screen.queryByText('Desactivar')).not.toBeInTheDocument();
    });
  });

  it('shows back button', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockPeriod);

    render(<AcademicPeriodDetailPage />, { wrapper: createWrapper(['/academic-periods/ap-1']) });

    await waitFor(() => {
      expect(screen.getByText('Volver a periodos')).toBeInTheDocument();
    });
  });

  it('shows date fields', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockPeriod);

    render(<AcademicPeriodDetailPage />, { wrapper: createWrapper(['/academic-periods/ap-1']) });

    await waitFor(() => {
      expect(screen.getByText(/15 de enero de 2026/)).toBeInTheDocument();
      expect(screen.getByText(/30 de junio de 2026/)).toBeInTheDocument();
    });
  });
});

describe('AcademicPeriodFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockParams = {};
  });

  it('renders create form', () => {
    render(<AcademicPeriodFormPage />, { wrapper: createWrapper(['/academic-periods/new']) });

    expect(screen.getByText('Nuevo periodo académico')).toBeInTheDocument();
    expect(screen.getByText('Crear periodo')).toBeInTheDocument();
  });

  it('renders form fields', () => {
    render(<AcademicPeriodFormPage />, { wrapper: createWrapper(['/academic-periods/new']) });

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Código')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha de inicio')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha de finalización')).toBeInTheDocument();
  });

  it('validates required name', async () => {
    render(<AcademicPeriodFormPage />, { wrapper: createWrapper(['/academic-periods/new']) });

    const submitButton = screen.getByText('Crear periodo');
    submitButton.click();

    await waitFor(() => {
      expect(screen.getByText('El nombre es requerido')).toBeInTheDocument();
    });
  });

  it('validates required code', async () => {
    render(<AcademicPeriodFormPage />, { wrapper: createWrapper(['/academic-periods/new']) });

    const nameInput = screen.getByLabelText('Nombre') as HTMLInputElement;
    nameInput.value = 'Test';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    const submitButton = screen.getByText('Crear periodo');
    submitButton.click();

    await waitFor(() => {
      expect(screen.getByText('El código es requerido')).toBeInTheDocument();
    });
  });

  it('validates date order', async () => {
    render(<AcademicPeriodFormPage />, { wrapper: createWrapper(['/academic-periods/new']) });

    const startDateInput = screen.getByLabelText('Fecha de inicio') as HTMLInputElement;
    const endDateInput = screen.getByLabelText('Fecha de finalización') as HTMLInputElement;

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(startDateInput, '2026-06-30');
      startDateInput.dispatchEvent(new Event('input', { bubbles: true }));
      nativeInputValueSetter.call(endDateInput, '2026-01-15');
      endDateInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const submitButton = screen.getByText('Crear periodo');
    submitButton.click();

    await waitFor(() => {
      expect(
        screen.getByText('La fecha de fin debe ser posterior a la fecha de inicio'),
      ).toBeInTheDocument();
    });
  });

  it('renders edit form with existing data', async () => {
    mockParams = { id: 'ap-1' };
    vi.mocked(apiClient.get).mockResolvedValue(mockPeriod);

    render(<AcademicPeriodFormPage />, { wrapper: createWrapper(['/academic-periods/ap-1/edit']) });

    await waitFor(() => {
      expect(screen.getByText('Editar periodo académico')).toBeInTheDocument();
    });
  });

  it('hides form when user lacks permission', () => {
    mockHasPermission.mockReturnValue(false);

    render(<AcademicPeriodFormPage />, { wrapper: createWrapper(['/academic-periods/new']) });

    expect(screen.getByText(/No tienes permisos/)).toBeInTheDocument();
  });

  it('shows cancel button that navigates back', () => {
    render(<AcademicPeriodFormPage />, { wrapper: createWrapper(['/academic-periods/new']) });

    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });
});
