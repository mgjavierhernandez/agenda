import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import {
  useInstitution,
  useUpdateInstitution,
  useRoles,
  useMemberships,
  useMembership,
  useCreateUser,
  useUpdateUser,
  useLinkUser,
  useAssignRole,
  useRemoveRole,
  useUpdateMembership,
  useUnlinkUser,
} from '../hooks';
import { apiClient } from '@/api/client';
import type { Institution, PaginatedApiResponse, UserMembership, User } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockInstitution: Institution = {
  id: 'inst-1',
  name: 'Demo School',
  slug: 'demo-school',
  status: 'ACTIVE',
};

const mockMembership: UserMembership = {
  id: 'mem-1',
  status: 'ACTIVE',
  userId: 'user-1',
  institutionId: 'inst-1',
  user: {
    id: 'user-1',
    email: 'admin@demo-school.dev',
    firstName: 'Admin',
    lastName: 'Demo',
    status: 'ACTIVE',
  },
  roles: [{ id: 'ur-1', role: { id: 'role-admin', name: 'INSTITUTION_ADMIN' } }],
};

const mockUser: User = {
  id: 'user-1',
  email: 'admin@demo-school.dev',
  firstName: 'Admin',
  lastName: 'Demo',
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

describe('Administration hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useInstitution', () => {
    it('fetches the institution', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockInstitution);

      const { result } = renderHook(() => useInstitution('inst-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockInstitution);
      expect(apiClient.get).toHaveBeenCalledWith('/institutions/inst-1');
    });

    it('does not fetch without an id', () => {
      const { result } = renderHook(() => useInstitution(null), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useUpdateInstitution', () => {
    it('patches the institution', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ ...mockInstitution, name: 'Nuevo' });

      const { result } = renderHook(() => useUpdateInstitution('inst-1'), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync({ name: 'Nuevo' });
      expect(res.name).toBe('Nuevo');
      expect(apiClient.patch).toHaveBeenCalledWith('/institutions/inst-1', { name: 'Nuevo' });
    });
  });

  describe('useRoles', () => {
    it('fetches roles', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([
        { id: 'role-admin', name: 'INSTITUTION_ADMIN', description: null, isSystem: true, assignable: true },
      ]);

      const { result } = renderHook(() => useRoles(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiClient.get).toHaveBeenCalledWith('/roles');
    });
  });

  describe('useMemberships', () => {
    it('fetches memberships with query params', async () => {
      const mockResponse: PaginatedApiResponse<UserMembership> = {
        data: [mockMembership],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useMemberships('inst-1', { page: 2, search: 'admin' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const url = vi.mocked(apiClient.get).mock.calls[0][0] as string;
      expect(url).toContain('/institutions/inst-1/memberships?');
      expect(url).toContain('page=2');
      expect(url).toContain('search=admin');
    });
  });

  describe('useMembership', () => {
    it('fetches a single membership', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockMembership);

      const { result } = renderHook(() => useMembership('inst-1', 'mem-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiClient.get).toHaveBeenCalledWith('/institutions/inst-1/memberships/mem-1');
    });
  });

  describe('useCreateUser', () => {
    it('creates a user', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });

      const input = {
        email: 'admin@demo-school.dev',
        password: 'Demo1234!',
        firstName: 'Admin',
        lastName: 'Demo',
      };
      const res = await result.current.mutateAsync(input);
      expect(res).toEqual(mockUser);
      expect(apiClient.post).toHaveBeenCalledWith('/users', input);
    });
  });

  describe('useUpdateUser', () => {
    it('patches a user', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ ...mockUser, firstName: 'Nuevo' });

      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });

      await result.current.mutateAsync({ id: 'user-1', data: { firstName: 'Nuevo' } });
      expect(apiClient.patch).toHaveBeenCalledWith('/users/user-1', { firstName: 'Nuevo' });
    });
  });

  describe('useLinkUser', () => {
    it('creates a membership', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ id: 'mem-2', userId: 'user-1', institutionId: 'inst-1', status: 'ACTIVE' });

      const { result } = renderHook(() => useLinkUser('inst-1'), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync({ userId: 'user-1', roleIds: ['role-admin'] });
      expect(res.id).toBe('mem-2');
      expect(apiClient.post).toHaveBeenCalledWith('/institutions/inst-1/memberships', {
        userId: 'user-1',
        roleIds: ['role-admin'],
      });
    });
  });

  describe('useAssignRole', () => {
    it('assigns a role to a user', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({});

      const { result } = renderHook(() => useAssignRole('inst-1'), { wrapper: createWrapper() });

      await result.current.mutateAsync({ userId: 'user-1', roleId: 'role-teacher' });
      expect(apiClient.post).toHaveBeenCalledWith('/institutions/inst-1/memberships/user/user-1/roles', {
        roleId: 'role-teacher',
      });
    });
  });

  describe('useRemoveRole', () => {
    it('removes a role from a user', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({});

      const { result } = renderHook(() => useRemoveRole('inst-1'), { wrapper: createWrapper() });

      await result.current.mutateAsync({ userId: 'user-1', roleId: 'role-teacher' });
      expect(apiClient.delete).toHaveBeenCalledWith(
        '/institutions/inst-1/memberships/user/user-1/roles/role-teacher',
      );
    });
  });

  describe('useUpdateMembership', () => {
    it('patches a membership', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue({ ...mockMembership, status: 'SUSPENDED' });

      const { result } = renderHook(() => useUpdateMembership('inst-1'), { wrapper: createWrapper() });

      await result.current.mutateAsync({ membershipId: 'mem-1', data: { status: 'SUSPENDED' } });
      expect(apiClient.patch).toHaveBeenCalledWith('/institutions/inst-1/memberships/mem-1', {
        status: 'SUSPENDED',
      });
    });
  });

  describe('useUnlinkUser', () => {
    it('unlinks a user', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({});

      const { result } = renderHook(() => useUnlinkUser('inst-1'), { wrapper: createWrapper() });

      await result.current.mutateAsync('user-1');
      expect(apiClient.delete).toHaveBeenCalledWith('/institutions/inst-1/memberships/user/user-1');
    });
  });
});
