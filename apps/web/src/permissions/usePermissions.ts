import { useAuth } from '@/auth/auth.store';
import { apiClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import type { PermissionCode } from './permission.constants';

interface RoleInfo {
  id: string;
  name: string;
  roleType: string;
}

interface MyPermissionsResponse {
  permissions: string[];
}

export function usePermissions() {
  const { selectedInstitutionId } = useAuth();

  const {
    data: permissionCodes = [],
    isLoading,
    isError,
  } = useQuery<string[]>({
    queryKey: ['user-permissions', selectedInstitutionId],
    queryFn: async () => {
      const res = await apiClient.get<MyPermissionsResponse>('/auth/my-permissions');
      return res.permissions ?? [];
    },
    enabled: !!selectedInstitutionId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const hasPermission = (code: PermissionCode): boolean => {
    if (isLoading) return false;
    return permissionCodes.includes(code);
  };

  const hasAnyPermission = (...codes: PermissionCode[]): boolean => {
    if (isLoading) return false;
    return codes.some((c) => permissionCodes.includes(c));
  };

  const hasAllPermissions = (...codes: PermissionCode[]): boolean => {
    if (isLoading) return false;
    return codes.every((c) => permissionCodes.includes(c));
  };

  return {
    permissionCodes,
    isLoading,
    isError,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
