import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useStudent, useDeactivateStudent } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('students:manage' as never);

  const { data: student, isLoading, error } = useStudent(id ?? '');
  const deactivateMutation = useDeactivateStudent();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeactivate = async () => {
    if (!id) return;
    await deactivateMutation.mutateAsync(id);
    setShowConfirm(false);
    navigate('/students');
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

  if (!student) {
    return (
      <ErrorState
        error={{ statusCode: 404, message: 'Estudiante no encontrado', timestamp: '', path: '' }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description={`${student.documentType}: ${student.documentNumber}`}
        actions={
          <div className="flex gap-2">
            {canManage && (
              <Button variant="secondary" onClick={() => navigate(`/students/${id}/edit`)}>
                Editar
              </Button>
            )}
            {canManage && student.status === 'ACTIVE' && (
              <Button variant="danger" onClick={() => setShowConfirm(true)}>
                Desactivar
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Nombre completo</dt>
              <dd className="text-gray-900">
                {student.firstName} {student.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Documento</dt>
              <dd className="text-gray-900">
                {student.documentType}: {student.documentNumber}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Fecha de nacimiento</dt>
              <dd className="text-gray-900">
                {student.dateOfBirth
                  ? new Date(student.dateOfBirth).toLocaleDateString('es-CO')
                  : 'No registrada'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={student.status === 'ACTIVE' ? 'success' : 'default'}>
                  {student.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
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
              <dd className="text-gray-900 font-mono text-xs">{student.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Creado</dt>
              <dd className="text-gray-900">
                {new Date(student.createdAt).toLocaleString('es-CO')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Última actualización</dt>
              <dd className="text-gray-900">
                {new Date(student.updatedAt).toLocaleString('es-CO')}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/students')}>
          Volver a estudiantes
        </Button>
      </div>

      {/* Deactivate confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar desactivación</h3>
            <p className="text-gray-600 mb-6">
              ¿Deseas desactivar al estudiante {student.firstName} {student.lastName}? Esta acción
              puede revertirse editando el estudiante.
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
