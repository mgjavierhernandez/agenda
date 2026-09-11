import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/auth/auth.store';
import {
  useMembership,
  useRoles,
  useAssignRole,
  useRemoveRole,
  useUnlinkUser,
  useUser,
} from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { DOCUMENT_TYPE_LABELS } from '@/api/types';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'Ocurrió un error inesperado.';
}

export function UserDetailPage() {
  const { membershipId } = useParams<{ membershipId: string }>();
  const navigate = useNavigate();
  const { selectedInstitutionId } = useAuth();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.MEMBERSHIPS_MANAGE);

  const { data: membership, isLoading, error } = useMembership(selectedInstitutionId, membershipId);
  const { data: fullUser } = useUser(selectedInstitutionId, membership?.userId);
  const { data: roles = [] } = useRoles();
  const assignRole = useAssignRole(selectedInstitutionId);
  const removeRole = useRemoveRole(selectedInstitutionId);
  const unlinkUser = useUnlinkUser(selectedInstitutionId);

  const [apiError, setApiError] = useState('');

  const assignableRoles = roles.filter((r) => r.assignable);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !membership) {
    return (
      <ErrorState
        error={{ statusCode: 404, message: 'Miembro no encontrado', timestamp: '', path: '' }}
      />
    );
  }

  const user = membership.user;
  const profile = fullUser?.profiles?.[0] ?? null;
  const assignedRoleIds = new Set(
    membership.roles.map((r) => (typeof r.role === 'string' ? r.role : r.role.id)),
  );
  const availableRoles = assignableRoles.filter((r) => !assignedRoleIds.has(r.id));

  const handleAssign = async (roleId: string) => {
    setApiError('');
    try {
      await assignRole.mutateAsync({ userId: membership.userId, roleId });
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const handleRemove = async (roleId: string) => {
    setApiError('');
    try {
      await removeRole.mutateAsync({ userId: membership.userId, roleId });
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const handleUnlink = async () => {
    setApiError('');
    if (
      !window.confirm(`¿Deseas desvincular a ${user.firstName} ${user.lastName} de la institución?`)
    ) {
      return;
    }
    try {
      await unlinkUser.mutateAsync(membership.userId);
      navigate('/admin/users');
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        description={user.email}
        actions={
          <Button variant="secondary" onClick={() => navigate('/admin/users')}>
            Volver
          </Button>
        }
      />

      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos del usuario</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Nombre</dt>
            <dd className="text-gray-900 font-medium">
              {user.firstName} {user.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Correo</dt>
            <dd className="text-gray-900 font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Estado</dt>
            <dd>
              <Badge variant={user.status === 'ACTIVE' ? 'success' : 'default'}>
                {user.status}
              </Badge>
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Perfil personal y profesional</h3>
        {!profile ? (
          <p className="text-sm text-gray-400">Sin perfil registrado en esta institución</p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Documento</dt>
              <dd className="text-gray-900 font-medium">
                {profile.documentType ? DOCUMENT_TYPE_LABELS[profile.documentType] : '—'}
                {profile.documentNumber ? ` ${profile.documentNumber}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Fecha de nacimiento</dt>
              <dd className="text-gray-900 font-medium">{profile.birthDate ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Teléfono</dt>
              <dd className="text-gray-900 font-medium">{profile.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Dirección</dt>
              <dd className="text-gray-900 font-medium">{profile.address ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Profesión</dt>
              <dd className="text-gray-900 font-medium">{profile.profession ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Perfil profesional</dt>
              <dd className="text-gray-900 font-medium">{profile.bio ?? '—'}</dd>
            </div>
          </dl>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Roles en la institución</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {membership.roles.length === 0 ? (
            <span className="text-sm text-gray-400">Sin roles asignados</span>
          ) : (
            membership.roles.map((r) => {
              const roleId = typeof r.role === 'string' ? r.role : r.role.id;
              const roleName = typeof r.role === 'string' ? r.role : r.role.name;
              return (
                <div key={roleId} className="flex items-center gap-2">
                  <Badge variant="default">{roleName}</Badge>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleRemove(roleId)}
                      className="text-xs text-red-600 hover:text-red-800"
                      aria-label={`Quitar rol ${roleName}`}
                    >
                      Quitar
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {canManage && availableRoles.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Asignar rol</h4>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map((role) => (
                <Button
                  key={role.id}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAssign(role.id)}
                >
                  + {role.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {canManage && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Zona peligrosa</h3>
          <p className="text-sm text-gray-500 mb-3">
            Desvincular al usuario de la institución elimina su acceso y roles.
          </p>
          <Button variant="danger" onClick={handleUnlink} isLoading={unlinkUser.isPending}>
            Desvincular usuario
          </Button>
        </Card>
      )}
    </div>
  );
}
