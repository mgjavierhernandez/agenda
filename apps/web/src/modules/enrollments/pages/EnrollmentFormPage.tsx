import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateEnrollment } from '../hooks';
import { useStudents } from '@/modules/students/hooks';
import { useCourses } from '@/modules/courses/hooks';
import { useSchoolGrades } from '@/modules/school-grades/hooks';
import { useAcademicPeriods } from '@/modules/academic-periods/hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { PERMISSIONS } from '@/permissions/permission.constants';
import type { CreateEnrollmentInput } from '@/api/types';

interface FormErrors {
  studentId?: string;
  courseId?: string;
  schoolGradeId?: string;
  academicPeriodId?: string;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'Ocurrió un error inesperado.';
}

export function EnrollmentFormPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.ENROLLMENTS_MANAGE);

  const createMutation = useCreateEnrollment();

  const { data: studentsData, isLoading: isLoadingStudents } = useStudents({ limit: 200 });
  const { data: coursesData, isLoading: isLoadingCourses } = useCourses({ limit: 200 });
  const { data: schoolGradesData, isLoading: isLoadingGrades } = useSchoolGrades({ limit: 200 });
  const { data: periodsData, isLoading: isLoadingPeriods } = useAcademicPeriods({ limit: 200 });

  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [schoolGradeId, setSchoolGradeId] = useState('');
  const [academicPeriodId, setAcademicPeriodId] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');

  const isLoadingSelectors =
    isLoadingStudents || isLoadingCourses || isLoadingGrades || isLoadingPeriods;

  if (!canManage) {
    return (
      <Card>
        <p className="text-gray-600">No tienes permisos para administrar matrículas.</p>
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

    if (!studentId) {
      newErrors.studentId = 'El estudiante es requerido';
    }
    if (!courseId) {
      newErrors.courseId = 'El curso es requerido';
    }
    if (!schoolGradeId) {
      newErrors.schoolGradeId = 'El grado escolar es requerido';
    }
    if (!academicPeriodId) {
      newErrors.academicPeriodId = 'El periodo académico es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    const payload: CreateEnrollmentInput = {
      studentId,
      courseId,
      schoolGradeId,
      academicPeriodId,
    };

    try {
      const created = await createMutation.mutateAsync(payload);
      navigate(`/enrollments/${created.id}`);
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva matrícula" description="Matricular un estudiante en un curso" />

      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos de la matrícula</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
                Estudiante *
              </label>
              <select
                id="studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccionar estudiante</option>
                {studentsData?.data.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} — {s.documentNumber}
                  </option>
                ))}
              </select>
              {errors.studentId && <p className="text-sm text-red-600 mt-1">{errors.studentId}</p>}
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
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              {errors.courseId && <p className="text-sm text-red-600 mt-1">{errors.courseId}</p>}
            </div>

            <div>
              <label
                htmlFor="schoolGradeId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Grado escolar *
              </label>
              <select
                id="schoolGradeId"
                value={schoolGradeId}
                onChange={(e) => setSchoolGradeId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccionar grado</option>
                {schoolGradesData?.data.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
              {errors.schoolGradeId && (
                <p className="text-sm text-red-600 mt-1">{errors.schoolGradeId}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="academicPeriodId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
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
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
              {errors.academicPeriodId && (
                <p className="text-sm text-red-600 mt-1">{errors.academicPeriodId}</p>
              )}
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate('/enrollments')}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            Crear matrícula
          </Button>
        </div>
      </form>
    </div>
  );
}
