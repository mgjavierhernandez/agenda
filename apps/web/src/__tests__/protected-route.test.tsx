import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/auth.store';
import { ProtectedRoute } from '@/app/ProtectedRoute';
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

function renderWithRouter(initialEntries: string[]) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Dashboard Content</div>} />
            </Route>
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to login when no session exists', async () => {
    renderWithRouter(['/dashboard']);
    const { findByText } = screen;
    expect(await findByText(/login page/i)).toBeDefined();
  });
});
