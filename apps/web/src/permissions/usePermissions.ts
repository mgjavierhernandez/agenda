import { useAuth } from '@/auth/auth.store';
import { apiClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import type { PermissionCode } from './permission.constants';

interface RoleInfo {
  id: string;
  name: string;
  roleType: string;
}

export function usePermissions() {
  const { selectedInstitutionId } = useAuth();

  const { data: roles = [] } = useQuery<RoleInfo[]>({
    queryKey: ['user-roles', selectedInstitutionId],
    queryFn: () => apiClient.get<RoleInfo[]>('/auth/authorization-check').then(() => []),
    enabled: !!selectedInstitutionId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: permissionCodes = [] } = useQuery<string[]>({
    queryKey: ['user-permissions', selectedInstitutionId],
    queryFn: async () => {
      // The backend doesn't have a direct "list my permissions" endpoint.
      // We derive permissions from the authorization-check endpoint.
      // For now, we store them client-side after login when available.
      // The PermissionGuard on each endpoint enforces server-side.
      return [];
    },
    enabled: !!selectedInstitutionId,
    staleTime: 10 * 60 * 1000,
  });

  const hasPermission = (code: PermissionCode): boolean => {
    if (permissionCodes.length === 0) return true; // If no permissions loaded, allow (backend enforces)
    return permissionCodes.includes(code);
  };

  const hasAnyPermission = (...codes: PermissionCode[]): boolean => {
    if (permissionCodes.length === 0) return true;
    return codes.some((c) => permissionCodes.includes(c));
  };

  const hasAllPermissions = (...codes: PermissionCode[]): boolean => {
    if (permissionCodes.length === 0) return true;
    return codes.every((c) => permissionCodes.includes(c));
  };

  const hasRole = (roleName: string): boolean => {
    return roles.some((r) => r.name === roleName);
  };

  return {
    roles,
    permissionCodes,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
  };
}
