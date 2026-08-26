import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PermissionGate } from '@/permissions/PermissionGate';

vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({
    selectedInstitutionId: 'inst-1',
    user: { id: '1', email: 'test@test.com', status: 'ACTIVE' },
  }),
}));

vi.mock('@/permissions/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (code: string) => code === 'students:read',
    hasAnyPermission: (...codes: string[]) => codes.includes('students:read'),
    hasAllPermissions: (...codes: string[]) => codes.every((c) => c === 'students:read'),
    permissionCodes: ['students:read'],
    isLoading: false,
    isError: false,
  }),
}));

describe('PermissionGate', () => {
  it('renders children when permission matches', () => {
    render(
      <PermissionGate permission="students:read">
        <span>Visible</span>
      </PermissionGate>,
    );
    expect(screen.getByText('Visible')).toBeDefined();
  });

  it('hides children when permission does not match', () => {
    render(
      <PermissionGate permission="users:manage">
        <span>Hidden</span>
      </PermissionGate>,
    );
    expect(screen.queryByText('Hidden')).toBeNull();
  });

  it('shows fallback when permission does not match', () => {
    render(
      <PermissionGate permission="users:manage" fallback={<span>Fallback</span>}>
        <span>Hidden</span>
      </PermissionGate>,
    );
    expect(screen.getByText('Fallback')).toBeDefined();
    expect(screen.queryByText('Hidden')).toBeNull();
  });
});
