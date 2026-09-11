import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { AuthProvider } from '@/auth/auth.store';
import { queryClient } from '@/api/query-client';

vi.mock('@/api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    setAccessToken: vi.fn(),
    setInstitutionId: vi.fn(),
    setOnUnauthorized: vi.fn(),
  },
}));

function renderLoginPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  it('renders email and password inputs', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeDefined();
    expect(screen.getByLabelText(/^Contraseña/)).toBeDefined();
  });

  it('renders submit button', () => {
    renderLoginPage();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeDefined();
  });

  it('shows error on failed login', async () => {
    const user = userEvent.setup();
    const { apiClient } = await import('@/api/client');
    vi.mocked(apiClient.post).mockRejectedValueOnce({
      statusCode: 401,
      message: 'Invalid credentials',
    });

    renderLoginPage();
    await user.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^Contraseña/), 'password123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
  });
});
