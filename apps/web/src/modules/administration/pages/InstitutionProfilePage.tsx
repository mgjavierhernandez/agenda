import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/auth.store';
import { useInstitution, useUpdateInstitution } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { PERMISSIONS } from '@/permissions/permission.constants';
import type { Institution } from '@/api/types';

const INSTITUTION_STATUS_VARIANT: Record<Institution['status'], 'success' | 'default' | 'danger'> =
  {
    ACTIVE: 'success',
    INACTIVE: 'default',
    SUSPENDED: 'danger',
  };

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'Ocurrió un error inesperado.';
}

export function InstitutionProfilePage() {
  const { selectedInstitutionId } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(PERMISSIONS.INSTITUTION_UPDATE);

  const { data: institution, isLoading, error } = useInstitution(selectedInstitutionId);
  const updateMutation = useUpdateInstitution(selectedInstitutionId);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<Institution['status']>('ACTIVE');
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (institution) {
      setName(institution.name);
      setSlug(institution.slug);
      setStatus(institution.status);
      setIsDirty(false);
      setSaved(false);
    }
  }, [institution]);

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!institution) {
    return (
      <ErrorState
        error={{ statusCode: 404, message: 'Institución no encontrada', timestamp: '', path: '' }}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setSaved(false);

    try {
      await updateMutation.mutateAsync({ name: name.trim(), slug: slug.trim(), status });
      setIsDirty(false);
      setSaved(true);
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil de la institución"
        description="Información general de la institución y estado"
      />

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">Cambios guardados correctamente.</p>
        </div>
      )}

      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Datos generales</h3>
          <Badge variant={INSTITUTION_STATUS_VARIANT[institution.status]}>
            {institution.status}
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Nombre de la institución"
            value={name}
            disabled={!canEdit}
            onChange={(e) => {
              setName(e.target.value);
              setIsDirty(true);
            }}
          />

          <Input
            label="Slug"
            placeholder="slug-de-la-institucion"
            value={slug}
            disabled={!canEdit}
            onChange={(e) => {
              setSlug(e.target.value);
              setIsDirty(true);
            }}
          />

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              id="status"
              value={status}
              disabled={!canEdit}
              onChange={(e) => {
                setStatus(e.target.value as Institution['status']);
                setIsDirty(true);
              }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
              <option value="SUSPENDED">Suspendido</option>
            </select>
          </div>

          {canEdit && (
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                type="button"
                disabled={!isDirty}
                onClick={() => {
                  setName(institution.name);
                  setSlug(institution.slug);
                  setStatus(institution.status);
                  setIsDirty(false);
                }}
              >
                Descartar
              </Button>
              <Button type="submit" disabled={!isDirty} isLoading={updateMutation.isPending}>
                Guardar cambios
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
