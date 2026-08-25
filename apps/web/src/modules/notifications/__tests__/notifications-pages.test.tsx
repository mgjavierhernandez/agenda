import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { NotificationsPage } from '../pages/NotificationsPage';
import { NotificationDetailPage } from '../pages/NotificationDetailPage';
import { apiClient } from '@/api/client';
import type { Notification } from '@/api/types';
import type { NotificationsListResponse } from '../hooks/useNotifications';

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
    roles: [],
    permissionCodes: [],
    hasPermission: vi.fn().mockReturnValue(true),
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
    hasRole: () => false,
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

const mockNotification: Notification = {
  id: 'notif-1',
  institutionId: 'inst-1',
  userId: 'user-1',
  type: 'SIGNATURE_REQUEST',
  title: 'Nueva solicitud de firma',
  message: 'Tienes una nueva solicitud de firma: Autorización de excursión.',
  status: 'UNREAD',
  entityType: 'SignatureRequest',
  entityId: null,
  readAt: null,
  createdAt: '2026-08-20T10:00:00Z',
  updatedAt: '2026-08-20T10:00:00Z',
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

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page header', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 }, unreadCount: 0 });

    render(<NotificationsPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
  });

  it('renders empty state when no notifications', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 }, unreadCount: 0 });

    render(<NotificationsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No hay notificaciones')).toBeInTheDocument();
    });
  });

  it('renders notifications in a table', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockNotification],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      unreadCount: 1,
    } as NotificationsListResponse);

    render(<NotificationsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Nueva solicitud de firma').length).toBeGreaterThan(0);
    });
  });

  it('shows unread count in header', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockNotification],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      unreadCount: 1,
    } as NotificationsListResponse);

    render(<NotificationsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('1 sin leer')).toBeInTheDocument();
    });
  });

  it('shows "Todas leídas" when no unread', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      unreadCount: 0,
    } as NotificationsListResponse);

    render(<NotificationsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Todas leídas')).toBeInTheDocument();
    });
  });

  it('shows mark all as read button when there are unread', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockNotification],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      unreadCount: 1,
    } as NotificationsListResponse);

    render(<NotificationsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Marcar todo como leído')).toBeInTheDocument();
    });
  });

  it('hides mark all as read button when no unread', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      unreadCount: 0,
    } as NotificationsListResponse);

    render(<NotificationsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.queryByText('Marcar todo como leído')).not.toBeInTheDocument();
    });
  });

  it('renders notification message in table', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockNotification],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      unreadCount: 1,
    } as NotificationsListResponse);

    render(<NotificationsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Tienes una nueva solicitud de firma: Autorización de excursión.').length).toBeGreaterThan(0);
    });
  });
});

describe('NotificationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'notif-1' };
  });

  it('renders notification details', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockNotification);

    render(<NotificationDetailPage />, { wrapper: createWrapper(['/notifications/notif-1']) });

    await waitFor(() => {
      expect(screen.getAllByText('Nueva solicitud de firma').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders notification message', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockNotification);

    render(<NotificationDetailPage />, { wrapper: createWrapper(['/notifications/notif-1']) });

    await waitFor(() => {
      expect(screen.getByText('Tienes una nueva solicitud de firma: Autorización de excursión.')).toBeInTheDocument();
    });
  });

  it('shows status badge', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockNotification);

    render(<NotificationDetailPage />, { wrapper: createWrapper(['/notifications/notif-1']) });

    await waitFor(() => {
      expect(screen.getByText('No leído')).toBeInTheDocument();
    });
  });

  it('shows mark as read button for unread notifications', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockNotification);

    render(<NotificationDetailPage />, { wrapper: createWrapper(['/notifications/notif-1']) });

    await waitFor(() => {
      expect(screen.getByText('Marcar como leído')).toBeInTheDocument();
    });
  });

  it('hides mark as read button for read notifications', async () => {
    const readNotif = { ...mockNotification, status: 'READ' as const };
    vi.mocked(apiClient.get).mockResolvedValue(readNotif);

    render(<NotificationDetailPage />, { wrapper: createWrapper(['/notifications/notif-1']) });

    await waitFor(() => {
      expect(screen.queryByText('Marcar como leído')).not.toBeInTheDocument();
    });
  });

  it('shows delete button', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockNotification);

    render(<NotificationDetailPage />, { wrapper: createWrapper(['/notifications/notif-1']) });

    await waitFor(() => {
      expect(screen.getByText('Eliminar')).toBeInTheDocument();
    });
  });

  it('shows entity type when present', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockNotification);

    render(<NotificationDetailPage />, { wrapper: createWrapper(['/notifications/notif-1']) });

    await waitFor(() => {
      expect(screen.getByText('SignatureRequest')).toBeInTheDocument();
    });
  });

  it('shows back button', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockNotification);

    render(<NotificationDetailPage />, { wrapper: createWrapper(['/notifications/notif-1']) });

    await waitFor(() => {
      expect(screen.getByText('Volver a notificaciones')).toBeInTheDocument();
    });
  });
});
