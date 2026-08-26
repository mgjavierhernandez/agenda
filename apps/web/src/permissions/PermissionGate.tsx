import type { ReactNode } from 'react';
import { usePermissions } from './usePermissions';
import type { PermissionCode } from './permission.constants';

interface PermissionGateProps {
  permission?: PermissionCode;
  permissions?: PermissionCode[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

  if (isLoading) {
    return <>{fallback}</>;
  }

  let allowed = true;
  if (permission) {
    allowed = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    allowed = requireAll ? hasAllPermissions(...permissions) : hasAnyPermission(...permissions);
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}
