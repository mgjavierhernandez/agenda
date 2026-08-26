import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { SignaturesPage } from '../pages/SignaturesPage';
import { SignatureDetailPage } from '../pages/SignatureDetailPage';
import { SignatureFormPage } from '../pages/SignatureFormPage';
import { apiClient } from '@/api/client';
import type { SignatureRequest, PaginatedApiResponse } from '@/api/types';

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

const mockSignature: SignatureRequest = {
  id: 'sig-1',
  institutionId: 'inst-1',
  title: 'Autorización de excursión',
  description: 'Firma para autorizar la excursión escolar',
  status: 'DRAFT',
  dueDate: null,
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z',
  recipients: [
    {
      id: 'sr-1',
      signatureRequestId: 'sig-1',
      userId: 'user-1',
      status: 'PENDING',
      signedAt: null,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
      user: { id: 'user-1', email: 'test@test.com', firstName: 'Test', lastName: 'User' },
    },
  ],
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

describe('SignaturesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('renders the page header', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

    render(<SignaturesPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Firmas')).toBeInTheDocument();
  });

  it('renders empty state when no signatures', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

    render(<SignaturesPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No hay solicitudes de firma')).toBeInTheDocument();
    });
  });

  it('renders signatures in a table', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockSignature],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } as PaginatedApiResponse<SignatureRequest>);

    render(<SignaturesPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Autorización de excursión').length).toBeGreaterThan(0);
    });
  });

  it('shows new request button for managers', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

    render(<SignaturesPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Nueva solicitud')).toBeInTheDocument();
    });
  });

  it('hides new request button for non-managers', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    mockHasPermission.mockImplementation((perm: string) => perm !== 'signatures:request');

    render(<SignaturesPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.queryByText('Nueva solicitud')).not.toBeInTheDocument();
    });
  });
});

describe('SignatureDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockParams = { id: 'sig-1' };
  });

  it('renders signature details', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockSignature);

    render(<SignatureDetailPage />, { wrapper: createWrapper(['/signatures/sig-1']) });

    await waitFor(() => {
      expect(screen.getAllByText('Autorización de excursión').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Firma para autorizar la excursión escolar').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows status badge', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockSignature);

    render(<SignatureDetailPage />, { wrapper: createWrapper(['/signatures/sig-1']) });

    await waitFor(() => {
      expect(screen.getByText('Borrador')).toBeInTheDocument();
    });
  });

  it('shows publish button for draft', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockSignature);

    render(<SignatureDetailPage />, { wrapper: createWrapper(['/signatures/sig-1']) });

    await waitFor(() => {
      expect(screen.getByText('Publicar')).toBeInTheDocument();
    });
  });

  it('shows edit button for draft', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockSignature);

    render(<SignatureDetailPage />, { wrapper: createWrapper(['/signatures/sig-1']) });

    await waitFor(() => {
      expect(screen.getByText('Editar')).toBeInTheDocument();
    });
  });

  it('renders recipients list', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockSignature);

    render(<SignatureDetailPage />, { wrapper: createWrapper(['/signatures/sig-1']) });

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@test.com')).toBeInTheDocument();
    });
  });

  it('shows sign button when user is pending recipient on published request', async () => {
    const publishedSig = {
      ...mockSignature,
      status: 'PUBLISHED' as const,
      recipients: [
        {
          ...mockSignature.recipients[0],
          status: 'PENDING' as const,
        },
      ],
    };
    vi.mocked(apiClient.get).mockResolvedValue(publishedSig);

    render(<SignatureDetailPage />, { wrapper: createWrapper(['/signatures/sig-1']) });

    await waitFor(() => {
      expect(screen.getByText('Firmar')).toBeInTheDocument();
    });
  });

  it('shows decline button when user is pending recipient on published request', async () => {
    const publishedSig = {
      ...mockSignature,
      status: 'PUBLISHED' as const,
      recipients: [
        {
          ...mockSignature.recipients[0],
          status: 'PENDING' as const,
        },
      ],
    };
    vi.mocked(apiClient.get).mockResolvedValue(publishedSig);

    render(<SignatureDetailPage />, { wrapper: createWrapper(['/signatures/sig-1']) });

    await waitFor(() => {
      expect(screen.getByText('Rechazar')).toBeInTheDocument();
    });
  });

  it('hides sign/decline buttons when request is not PUBLISHED', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockSignature);

    render(<SignatureDetailPage />, { wrapper: createWrapper(['/signatures/sig-1']) });

    await waitFor(() => {
      expect(screen.queryByText('Firmar')).not.toBeInTheDocument();
      expect(screen.queryByText('Rechazar')).not.toBeInTheDocument();
    });
  });

  it('shows expired warning for EXPIRED status', async () => {
    const expiredSig = { ...mockSignature, status: 'EXPIRED' as const };
    vi.mocked(apiClient.get).mockResolvedValue(expiredSig);

    render(<SignatureDetailPage />, { wrapper: createWrapper(['/signatures/sig-1']) });

    await waitFor(() => {
      expect(screen.getByText(/expiró/)).toBeInTheDocument();
    });
  });

  it('hides publish button for non-managers', async () => {
    mockHasPermission.mockImplementation((perm: string) => perm !== 'signatures:request');
    vi.mocked(apiClient.get).mockResolvedValue(mockSignature);

    render(<SignatureDetailPage />, { wrapper: createWrapper(['/signatures/sig-1']) });

    await waitFor(() => {
      expect(screen.queryByText('Publicar')).not.toBeInTheDocument();
      expect(screen.queryByText('Editar')).not.toBeInTheDocument();
      expect(screen.queryByText('Desactivar')).not.toBeInTheDocument();
    });
  });
});

describe('SignatureFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockParams = {};
  });

  it('renders create form', () => {
    render(<SignatureFormPage />, { wrapper: createWrapper(['/signatures/new']) });

    expect(screen.getByText('Nueva solicitud de firma')).toBeInTheDocument();
    expect(screen.getByText('Crear solicitud')).toBeInTheDocument();
  });

  it('renders recipient input for create mode', () => {
    render(<SignatureFormPage />, { wrapper: createWrapper(['/signatures/new']) });

    expect(screen.getByText(/Firmantes/)).toBeInTheDocument();
  });

  it('validates required title', async () => {
    render(<SignatureFormPage />, { wrapper: createWrapper(['/signatures/new']) });

    const submitButton = screen.getByText('Crear solicitud');
    submitButton.click();

    await waitFor(() => {
      expect(screen.getByText('El título es requerido')).toBeInTheDocument();
    });
  });

  it('hides form when user lacks permission', () => {
    mockHasPermission.mockReturnValue(false);

    render(<SignatureFormPage />, { wrapper: createWrapper(['/signatures/new']) });

    expect(screen.getByText(/No tienes permisos/)).toBeInTheDocument();
  });
});
