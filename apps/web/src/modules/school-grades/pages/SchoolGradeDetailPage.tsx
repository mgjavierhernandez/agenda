import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useSchoolGrade, useDeactivateSchoolGrade } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import type { SchoolGradeStatus } from '@/api/types';
import { SCHOOL_GRADE_STATUS_LABELS } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<SchoolGradeStatus, 'success' | 'default'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
};

export function SchoolGradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SCHOOL_GRADES_MANAGE);

  const { data: grade, isLoading, error } = useSchoolGrade(id ?? '');
  const deactivateMutation = useDeactivateSchoolGrade();

  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const handleDeactivate = async () => {
    if (!id) return;
    try {
      await deactivateMutation.mutateAsync(id);
      setConfirmDeactivate(false);
    } catch {
      setConfirmDeactivate(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  if (!grade) {
    return <ErrorState error={{ statusCode: 404, message: 'Grado no encontrado', timestamp: '', path: '' }} />;
  }

  const canEdit = canManage;
  const canDeactivate = canManage && grade.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      <PageHeader
        title={grade.name}
        description={`Código: ${grade.code}`}
        actions={
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="secondary" onClick={() => navigate(`/school-grades/${id}/edit`)}>
                Editar
              </Button>
            )}
            {canDeactivate && (
              <Button variant="danger" onClick={() => setConfirmDeactivate(true)}>
                Desactivar
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Grado</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Nombre</dt>
              <dd className="text-gray-900">{grade.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Código</dt>
              <dd className="text-gray-900 font-mono">{grade.code}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Orden</dt>
              <dd className="text-gray-900 font-mono">{grade.sortOrder}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={STATUS_BADGE_VARIANT[grade.status]}>
                  {SCHOOL_GRADE_STATUS_LABELS[grade.status]}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadatos</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">ID</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{grade.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Creado</dt>
              <dd className="text-gray-900">
                {new Date(grade.createdAt).toLocaleString('es-CO')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Última actualización</dt>
              <dd className="text-gray-900">
                {new Date(grade.updatedAt).toLocaleString('es-CO')}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/school-grades')}>
          Volver a grados
        </Button>
      </div>

      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirmar desactivación
            </h3>
            <p className="text-gray-600 mb-6">
              ¿Deseas desactivar el grado "{grade.name}"? Esta acción cambiará su estado a Inactivo.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmDeactivate(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                isLoading={deactivateMutation.isPending}
                onClick={handleDeactivate}
              >
                Desactivar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
