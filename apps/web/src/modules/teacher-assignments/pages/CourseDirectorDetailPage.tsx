import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  useCourseDirectorAssignment,
  useDeactivateCourseDirectorAssignment,
  useUpdateCourseDirectorAssignment,
} from '../hooks';
import { useUsers } from '../hooks/useUsers';
import { useCourse } from '@/modules/courses/hooks';
import { useAcademicPeriod } from '@/modules/academic-periods/hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { COURSE_DIRECTOR_STATUS_LABELS } from '@/api/types';
import type { CourseDirectorStatus } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<CourseDirectorStatus, 'success' | 'default'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
};

export function CourseDirectorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.TEACHER_ASSIGNMENTS_MANAGE);

  const { data: assignment, isLoading, error } = useCourseDirectorAssignment(id ?? '');
  const deactivateMutation = useDeactivateCourseDirectorAssignment();
  const updateMutation = useUpdateCourseDirectorAssignment();

  const { data: usersData } = useUsers({ limit: 200 });
  const { data: course } = useCourse(assignment?.courseId ?? '');
  const { data: academicPeriod } = useAcademicPeriod(assignment?.academicPeriodId ?? '');

  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'activate' | null>(null);

  const directorName = usersData?.data.find((u) => u.id === assignment?.directorUserId);

  const handleDeactivate = async () => {
    if (!id) return;
    try {
      await deactivateMutation.mutateAsync(id);
      setConfirmAction(null);
    } catch {
      setConfirmAction(null);
    }
  };

  const handleActivate = async () => {
    if (!id) return;
    try {
      await updateMutation.mutateAsync({ id, data: { status: 'ACTIVE' as CourseDirectorStatus } });
      setConfirmAction(null);
    } catch {
      setConfirmAction(null);
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

  if (!assignment) {
    return (
      <ErrorState
        error={{ statusCode: 404, message: 'Asignación no encontrada', timestamp: '', path: '' }}
      />
    );
  }

  const canDeactivate = canManage && assignment.status === 'ACTIVE';
  const canActivate = canManage && assignment.status === 'INACTIVE';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Director de grupo — ${directorName ? `${directorName.firstName} ${directorName.lastName}` : 'Director'}`}
        description={`Curso: ${course?.name ?? '—'} | Periodo: ${academicPeriod?.name ?? '—'}`}
        actions={
          <div className="flex gap-2">
            {canDeactivate && (
              <Button variant="danger" onClick={() => setConfirmAction('deactivate')}>
                Desactivar
              </Button>
            )}
            {canActivate && (
              <Button variant="secondary" onClick={() => setConfirmAction('activate')}>
                Activar
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Asignación</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Director</dt>
              <dd className="text-gray-900">
                {directorName
                  ? `${directorName.firstName} ${directorName.lastName}`
                  : assignment.directorUserId}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Email del director</dt>
              <dd className="text-gray-900">{directorName?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Curso</dt>
              <dd className="text-gray-900">
                {course ? `${course.name} (${course.code})` : assignment.courseId}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Periodo académico</dt>
              <dd className="text-gray-900">
                {academicPeriod
                  ? `${academicPeriod.name} (${academicPeriod.code})`
                  : assignment.academicPeriodId}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Fecha de inicio</dt>
              <dd className="text-gray-900">
                {assignment.startDate
                  ? new Date(assignment.startDate).toLocaleDateString('es-CO')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Fecha de fin</dt>
              <dd className="text-gray-900">
                {assignment.endDate
                  ? new Date(assignment.endDate).toLocaleDateString('es-CO')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={STATUS_BADGE_VARIANT[assignment.status]}>
                  {COURSE_DIRECTOR_STATUS_LABELS[assignment.status]}
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
              <dd className="text-gray-900 font-mono text-xs break-all">{assignment.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Creado</dt>
              <dd className="text-gray-900">
                {new Date(assignment.createdAt).toLocaleString('es-CO')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Última actualización</dt>
              <dd className="text-gray-900">
                {new Date(assignment.updatedAt).toLocaleString('es-CO')}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/course-directors')}>
          Volver a directores de grupo
        </Button>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmAction === 'deactivate' ? 'Confirmar desactivación' : 'Confirmar activación'}
            </h3>
            <p className="text-gray-600 mb-6">
              {confirmAction === 'deactivate'
                ? '¿Deseas desactivar esta asignación? El estado cambiará a Inactivo.'
                : '¿Deseas activar esta asignación? El estado cambiará a Activo.'}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmAction(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                isLoading={
                  confirmAction === 'deactivate'
                    ? deactivateMutation.isPending
                    : updateMutation.isPending
                }
                onClick={confirmAction === 'deactivate' ? handleDeactivate : handleActivate}
              >
                {confirmAction === 'deactivate' ? 'Desactivar' : 'Activar'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
