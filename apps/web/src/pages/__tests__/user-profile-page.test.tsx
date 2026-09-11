import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { UserProfilePage } from '../UserProfilePage';
import { apiClient } from '@/api/client';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));

vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'parent@test.com', status: 'ACTIVE' },
    selectedInstitutionId: 'inst-1',
    isAuthenticated: true,
  }),
}));

vi.mock('@/tenant/tenant.store', () => ({
  useTenant: () => ({ selectedInstitutionId: 'inst-1' }),
}));

const mockMutateAsync = vi.fn();

vi.mock('@/modules/administration/hooks', () => ({
  useUpsertUserProfile: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/profile']}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('UserProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and shows the profile without admin permissions', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      id: 'p1',
      userId: 'user-1',
      documentType: 'DNI',
      documentNumber: '123',
      phone: '555',
      address: null,
      birthDate: null,
      profession: null,
      bio: null,
    });

    render(<UserProfilePage />, { wrapper });

    // No queda cargando indefinidamente: el formulario aparece.
    await waitFor(() => expect(screen.getByText('Mi perfil')).toBeDefined());
    expect(screen.getByText('parent@test.com')).toBeDefined();
    expect(screen.getByDisplayValue('123')).toBeDefined();
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/users/user-1/profile');
  });

  it('shows an error when loading fails', async () => {
    vi.mocked(apiClient.get).mockRejectedValue({ response: { data: { message: 'Error' } } });

    render(<UserProfilePage />, { wrapper });

    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
  });

  it('saves changes and shows success', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(null);
    mockMutateAsync.mockResolvedValue({ id: 'p1' });
    const user = userEvent.setup();

    render(<UserProfilePage />, { wrapper });

    await waitFor(() => expect(screen.getByText('Mi perfil')).toBeDefined());
    await user.type(screen.getByPlaceholderText('Teléfono'), '555-123');
    await user.click(screen.getByText('Guardar cambios'));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
    expect(screen.getByText('Perfil guardado correctamente.')).toBeDefined();
  });
});
