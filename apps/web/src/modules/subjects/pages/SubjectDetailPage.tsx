import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useSubject, useDeactivateSubject } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';

export function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SUBJECTS_MANAGE);

  const { data: subject, isLoading, error } = useSubject(id ?? '');
  const deactivateMutation = useDeactivateSubject();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeactivate = async () => {
    if (!id) return;
    await deactivateMutation.mutateAsync(id);
    setShowConfirm(false);
    navigate('/subjects');
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

  if (!subject) {
    return <ErrorState error={{ statusCode: 404, message: 'Asignatura no encontrada', timestamp: '', path: '' }} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={subject.name}
        description={`Código: ${subject.code}`}
        actions={
          <div className="flex gap-2">
            {canManage && (
              <Button variant="secondary" onClick={() => navigate(`/subjects/${id}/edit`)}>
                Editar
              </Button>
            )}
            {canManage && subject.status === 'ACTIVE' && (
              <Button variant="danger" onClick={() => setShowConfirm(true)}>
                Desactivar
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Asignatura</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Código</dt>
              <dd className="text-gray-900 font-mono">{subject.code}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Nombre</dt>
              <dd className="text-gray-900">{subject.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Descripción</dt>
              <dd className="text-gray-900">{subject.description || 'Sin descripción'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={subject.status === 'ACTIVE' ? 'success' : 'default'}>
                  {subject.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
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
              <dd className="text-gray-900 font-mono text-xs">{subject.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Creado</dt>
              <dd className="text-gray-900">
                {new Date(subject.createdAt).toLocaleString('es-CO')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Última actualización</dt>
              <dd className="text-gray-900">
                {new Date(subject.updatedAt).toLocaleString('es-CO')}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/subjects')}>
          Volver a asignaturas
        </Button>
      </div>

      {/* Deactivate confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar desactivación</h3>
            <p className="text-gray-600 mb-6">
              ¿Deseas desactivar la asignatura {subject.name}? Esta acción puede revertirse editando la asignatura.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>
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
