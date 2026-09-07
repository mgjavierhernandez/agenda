import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateTeacherAssignment, useUsers } from '../hooks';
import { useCourses } from '@/modules/courses/hooks';
import { useSubjects } from '@/modules/subjects/hooks';
import { useAcademicPeriods } from '@/modules/academic-periods/hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { PERMISSIONS } from '@/permissions/permission.constants';
import type { CreateTeacherAssignmentInput } from '@/api/types';

interface FormErrors {
  teacherUserId?: string;
  courseId?: string;
  subjectId?: string;
  academicPeriodId?: string;
  startDate?: string;
  endDate?: string;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'Ocurrió un error inesperado.';
}

export function TeacherAssignmentFormPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.TEACHER_ASSIGNMENTS_MANAGE);

  const createMutation = useCreateTeacherAssignment();

  const { data: usersData, isLoading: isLoadingUsers } = useUsers({ limit: 200 });
  const { data: coursesData, isLoading: isLoadingCourses } = useCourses({ limit: 200 });
  const { data: subjectsData, isLoading: isLoadingSubjects } = useSubjects({ limit: 200 });
  const { data: periodsData, isLoading: isLoadingPeriods } = useAcademicPeriods({ limit: 200 });

  const [teacherUserId, setTeacherUserId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [academicPeriodId, setAcademicPeriodId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');

  const isLoadingSelectors = isLoadingUsers || isLoadingCourses || isLoadingSubjects || isLoadingPeriods;

  if (!canManage) {
    return (
      <Card>
        <p className="text-gray-600">No tienes permisos para administrar asignaciones docentes.</p>
      </Card>
    );
  }

  if (isLoadingSelectors) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!teacherUserId) {
      newErrors.teacherUserId = 'El profesor es requerido';
    }
    if (!courseId) {
      newErrors.courseId = 'El curso es requerido';
    }
    if (!subjectId) {
      newErrors.subjectId = 'La asignatura es requerida';
    }
    if (!academicPeriodId) {
      newErrors.academicPeriodId = 'El periodo académico es requerido';
    }
    if (!startDate) {
      newErrors.startDate = 'La fecha de inicio es requerida';
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = 'La fecha de fin no puede ser anterior a la fecha de inicio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    const payload: CreateTeacherAssignmentInput = {
      teacherUserId,
      courseId,
      subjectId,
      academicPeriodId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    try {
      const created = await createMutation.mutateAsync(payload);
      navigate(`/teacher-assignments/${created.id}`);
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva asignación docente"
        description="Asignar un profesor a una asignatura en un curso y periodo"
      />

      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos de la asignación</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="teacherUserId" className="block text-sm font-medium text-gray-700 mb-1">
                Profesor *
              </label>
              <select
                id="teacherUserId"
                value={teacherUserId}
                onChange={(e) => setTeacherUserId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccionar profesor</option>
                {usersData?.data.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                ))}
              </select>
              {errors.teacherUserId && <p className="text-sm text-red-600 mt-1">{errors.teacherUserId}</p>}
            </div>

            <div>
              <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 mb-1">
                Curso *
              </label>
              <select
                id="courseId"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccionar curso</option>
                {coursesData?.data.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
              {errors.courseId && <p className="text-sm text-red-600 mt-1">{errors.courseId}</p>}
            </div>

            <div>
              <label htmlFor="subjectId" className="block text-sm font-medium text-gray-700 mb-1">
                Asignatura *
              </label>
              <select
                id="subjectId"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccionar asignatura</option>
                {subjectsData?.data.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
              {errors.subjectId && <p className="text-sm text-red-600 mt-1">{errors.subjectId}</p>}
            </div>

            <div>
              <label htmlFor="academicPeriodId" className="block text-sm font-medium text-gray-700 mb-1">
                Periodo académico *
              </label>
              <select
                id="academicPeriodId"
                value={academicPeriodId}
                onChange={(e) => setAcademicPeriodId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccionar periodo</option>
                {periodsData?.data.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
              {errors.academicPeriodId && <p className="text-sm text-red-600 mt-1">{errors.academicPeriodId}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de inicio *
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.startDate && <p className="text-sm text-red-600 mt-1">{errors.startDate}</p>}
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de fin
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.endDate && <p className="text-sm text-red-600 mt-1">{errors.endDate}</p>}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate('/teacher-assignments')}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            Crear asignación
          </Button>
        </div>
      </form>
    </div>
  );
}
