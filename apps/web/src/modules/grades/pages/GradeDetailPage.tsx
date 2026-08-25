import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useGrade, useDeactivateGrade } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';

export function GradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.GRADES_MANAGE);

  const { data: grade, isLoading, error } = useGrade(id ?? '');
  const deactivateMutation = useDeactivateGrade();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeactivate = async () => {
    if (!id) return;
    await deactivateMutation.mutateAsync(id);
    setShowConfirm(false);
    navigate('/grades');
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
    return <ErrorState error={{ statusCode: 404, message: 'Calificación no encontrada', timestamp: '', path: '' }} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Calificación: ${grade.value}`}
        description={`${grade.period}${grade.evaluationType ? ` — ${grade.evaluationType}` : ''}`}
        actions={
          <div className="flex gap-2">
            {canManage && (
              <Button variant="secondary" onClick={() => navigate(`/grades/${id}/edit`)}>
                Editar
              </Button>
            )}
            {canManage && grade.status === 'ACTIVE' && (
              <Button variant="danger" onClick={() => setShowConfirm(true)}>
                Desactivar
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Calificación</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Valor</dt>
              <dd className="text-gray-900 text-2xl font-bold">{grade.value}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Período</dt>
              <dd className="text-gray-900">{grade.period}</dd>
            </div>
            {grade.evaluationType && (
              <div>
                <dt className="text-sm text-gray-500">Tipo de evaluación</dt>
                <dd className="text-gray-900">{grade.evaluationType}</dd>
              </div>
            )}
            {grade.description && (
              <div>
                <dt className="text-sm text-gray-500">Descripción</dt>
                <dd className="text-gray-900">{grade.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={grade.status === 'ACTIVE' ? 'success' : 'default'}>
                  {grade.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Relaciones y Metadatos</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Estudiante</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{grade.studentId}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Curso</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{grade.courseId}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Asignatura</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{grade.subjectId}</dd>
            </div>
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
        <Button variant="ghost" onClick={() => navigate('/grades')}>
          Volver a calificaciones
        </Button>
      </div>

      {/* Deactivate confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar desactivación</h3>
            <p className="text-gray-600 mb-6">
              ¿Deseas desactivar la calificación {grade.value} del período {grade.period}? Esta acción puede revertirse editando la calificación.
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
