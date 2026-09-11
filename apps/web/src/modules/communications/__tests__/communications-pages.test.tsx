import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { CommunicationsPage } from '../pages/CommunicationsPage';
import { CommunicationDetailPage } from '../pages/CommunicationDetailPage';
import { CommunicationFormPage } from '../pages/CommunicationFormPage';
import { CommunicationInboxPage } from '@/modules/communication-recipients/pages/CommunicationInboxPage';
import { apiClient } from '@/api/client';
import type { Communication, PaginatedApiResponse, CommunicationRecipient } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('@/permissions/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: () => true,
  }),
}));

vi.mock('@/modules/files/hooks', () => ({
  useCommunicationAttachments: () => ({ data: [], isLoading: false }),
  useCreateCommunicationAttachment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

let mockParams: Record<string, string> = {};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
  };
});

const mockCommunication: Communication = {
  id: 'comm-1',
  institutionId: 'inst-1',
  title: 'Comunicado importante',
  content: 'Contenido del comunicado',
  audience: 'ALL',
  status: 'DRAFT',
  publishedAt: null,
  expiresAt: null,
  authorId: 'user-1',
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z',
};

const mockRecipient: CommunicationRecipient = {
  id: 'cr-1',
  institutionId: 'inst-1',
  communicationId: 'comm-1',
  userId: 'user-1',
  status: 'DELIVERED',
  readAt: null,
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z',
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

describe('CommunicationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page header', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    render(<CommunicationsPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Comunicaciones')).toBeInTheDocument();
  });

  it('renders empty state when no communications', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    render(<CommunicationsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No hay comunicaciones registradas')).toBeInTheDocument();
    });
  });

  it('renders communications in a table', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockCommunication],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } as PaginatedApiResponse<Communication>);

    render(<CommunicationsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Comunicado importante').length).toBeGreaterThan(0);
    });
  });

  it('shows new communication button for managers', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    render(<CommunicationsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Nueva comunicación')).toBeInTheDocument();
    });
  });
});

describe('CommunicationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'comm-1' };
  });

  it('renders communication details', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockCommunication);

    render(<CommunicationDetailPage />, { wrapper: createWrapper(['/communications/comm-1']) });

    await waitFor(() => {
      expect(screen.getAllByText('Comunicado importante').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Contenido del comunicado')).toBeInTheDocument();
    });
  });

  it('shows publish button for draft communications', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockCommunication);

    render(<CommunicationDetailPage />, { wrapper: createWrapper(['/communications/comm-1']) });

    await waitFor(() => {
      expect(screen.getByText('Publicar')).toBeInTheDocument();
    });
  });
});

describe('CommunicationFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
  });

  it('renders create form', () => {
    render(<CommunicationFormPage />, { wrapper: createWrapper(['/communications/new']) });

    expect(screen.getByText('Nueva comunicación')).toBeInTheDocument();
    expect(screen.getByText('Crear comunicación')).toBeInTheDocument();
  });
});

describe('CommunicationInboxPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders inbox page header', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    render(<CommunicationInboxPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Bandeja de entrada')).toBeInTheDocument();
  });

  it('shows empty state when no recipients', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    render(<CommunicationInboxPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No hay comunicaciones recibidas')).toBeInTheDocument();
    });
  });

  it('renders recipient list', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ ...mockRecipient, communication: mockCommunication }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });

    render(<CommunicationInboxPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Comunicado importante').length).toBeGreaterThan(0);
    });
  });
});
