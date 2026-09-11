import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useEnrollment, useDeactivateEnrollment, useUpdateEnrollment } from '../hooks';
import { useStudent } from '@/modules/students/hooks';
import { useCourse } from '@/modules/courses/hooks';
import { useSchoolGrade } from '@/modules/school-grades/hooks';
import { useAcademicPeriod } from '@/modules/academic-periods/hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { ENROLLMENT_STATUS_LABELS } from '@/api/types';
import type { EnrollmentStatus } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<EnrollmentStatus, 'success' | 'warning' | 'default'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  WITHDRAWN: 'warning',
};

export function EnrollmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.ENROLLMENTS_MANAGE);

  const { data: enrollment, isLoading, error } = useEnrollment(id ?? '');
  const deactivateMutation = useDeactivateEnrollment();
  const updateMutation = useUpdateEnrollment();

  const { data: student } = useStudent(enrollment?.studentId ?? '');
  const { data: course } = useCourse(enrollment?.courseId ?? '');
  const { data: schoolGrade } = useSchoolGrade(enrollment?.schoolGradeId ?? '');
  const { data: academicPeriod } = useAcademicPeriod(enrollment?.academicPeriodId ?? '');

  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'withdraw' | null>(null);

  const handleDeactivate = async () => {
    if (!id) return;
    try {
      await deactivateMutation.mutateAsync(id);
      setConfirmAction(null);
    } catch {
      setConfirmAction(null);
    }
  };

  const handleWithdraw = async () => {
    if (!id) return;
    try {
      await updateMutation.mutateAsync({ id, data: { status: 'WITHDRAWN' } });
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

  if (!enrollment) {
    return (
      <ErrorState
        error={{ statusCode: 404, message: 'Matrícula no encontrada', timestamp: '', path: '' }}
      />
    );
  }

  const canDeactivate = canManage && enrollment.status === 'ACTIVE';
  const canWithdraw = canManage && enrollment.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Matrícula — ${student?.firstName ?? ''} ${student?.lastName ?? ''}`}
        description={`Curso: ${course?.name ?? '—'} | Periodo: ${academicPeriod?.name ?? '—'}`}
        actions={
          <div className="flex gap-2">
            {canDeactivate && (
              <Button variant="danger" onClick={() => setConfirmAction('deactivate')}>
                Desactivar
              </Button>
            )}
            {canWithdraw && (
              <Button variant="secondary" onClick={() => setConfirmAction('withdraw')}>
                Retirar
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Matrícula</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Estudiante</dt>
              <dd className="text-gray-900">
                {student ? `${student.firstName} ${student.lastName}` : enrollment.studentId}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Documento</dt>
              <dd className="text-gray-900">
                {student ? `${student.documentType} ${student.documentNumber}` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Curso</dt>
              <dd className="text-gray-900">
                {course ? `${course.name} (${course.code})` : enrollment.courseId}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Grado escolar</dt>
              <dd className="text-gray-900">
                {schoolGrade
                  ? `${schoolGrade.name} (${schoolGrade.code})`
                  : enrollment.schoolGradeId}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Periodo académico</dt>
              <dd className="text-gray-900">
                {academicPeriod
                  ? `${academicPeriod.name} (${academicPeriod.code})`
                  : enrollment.academicPeriodId}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={STATUS_BADGE_VARIANT[enrollment.status]}>
                  {ENROLLMENT_STATUS_LABELS[enrollment.status]}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Fecha de matrícula</dt>
              <dd className="text-gray-900">
                {new Date(enrollment.enrolledAt).toLocaleDateString('es-CO')}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadatos</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">ID</dt>
              <dd className="text-gray-900 font-mono text-xs break-all">{enrollment.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Creado</dt>
              <dd className="text-gray-900">
                {new Date(enrollment.createdAt).toLocaleString('es-CO')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Última actualización</dt>
              <dd className="text-gray-900">
                {new Date(enrollment.updatedAt).toLocaleString('es-CO')}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/enrollments')}>
          Volver a matrículas
        </Button>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmAction === 'deactivate' ? 'Confirmar desactivación' : 'Confirmar retiro'}
            </h3>
            <p className="text-gray-600 mb-6">
              {confirmAction === 'deactivate'
                ? '¿Deseas desactivar esta matrícula? El estado cambiará a Inactivo.'
                : '¿Deseas retirar esta matrícula? El estado cambiará a Retirada.'}
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
                onClick={confirmAction === 'deactivate' ? handleDeactivate : handleWithdraw}
              >
                {confirmAction === 'deactivate' ? 'Desactivar' : 'Retirar'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
