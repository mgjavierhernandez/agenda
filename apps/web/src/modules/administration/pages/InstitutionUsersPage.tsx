import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/auth.store';
import { useMemberships } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';

const STATUS_VARIANT: Record<'ACTIVE' | 'INACTIVE' | 'SUSPENDED', 'success' | 'default' | 'danger'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  SUSPENDED: 'danger',
};

export function InstitutionUsersPage() {
  const navigate = useNavigate();
  const { selectedInstitutionId } = useAuth();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(PERMISSIONS.USERS_CREATE) || hasPermission(PERMISSIONS.MEMBERSHIPS_MANAGE);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = useMemberships(selectedInstitutionId, {
    page,
    limit,
    search: debouncedSearch || undefined,
  });

  const members = data?.data ?? [];
  const meta = data?.meta;

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  }, []);

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Usuarios vinculados a la institución y sus roles"
        actions={
          canCreate ? (
            <Button onClick={() => navigate('/admin/users/new')}>Nuevo usuario</Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Buscar por nombre, apellido o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {debouncedSearch && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 self-end mb-1"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? 'No se encontraron usuarios' : 'No hay usuarios vinculados'}
          description={
            debouncedSearch
              ? 'No encontramos usuarios que coincidan con la búsqueda.'
              : 'Comienza creando un usuario y vincúlalo a la institución.'
          }
          action={
            canCreate && !debouncedSearch ? (
              <Button onClick={() => navigate('/admin/users/new')}>Nuevo usuario</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="hidden md:block">
          <Card padding="none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Usuario</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Correo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Roles</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {member.user.firstName} {member.user.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{member.user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {member.roles.length === 0 ? (
                          <span className="text-xs text-gray-400">Sin roles</span>
                        ) : (
                          member.roles.map((r) => (
                            <Badge key={r.id} variant="default">
                              {r.role.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[member.user.status]}>{member.user.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/users/${member.id}`)}
                      >
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      <div className="md:hidden space-y-3">
        {members.map((member) => (
          <Card key={member.id}>
            <div className="flex items-start justify-between">
              <div className="space-y-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {member.user.firstName} {member.user.lastName}
                </p>
                <p className="text-sm text-gray-500">{member.user.email}</p>
                <div className="flex flex-wrap gap-1">
                  {member.roles.length === 0 ? (
                    <span className="text-xs text-gray-400">Sin roles</span>
                  ) : (
                    member.roles.map((r) => (
                      <Badge key={r.id} variant="default">
                        {r.role.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[member.user.status]}>{member.user.status}</Badge>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/admin/users/${member.id}`)}
              >
                Ver detalle
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Mostrando {(meta.page - 1) * meta.limit + 1}–
            {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="flex items-center px-3 text-gray-700">
              Página {meta.page} de {meta.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
