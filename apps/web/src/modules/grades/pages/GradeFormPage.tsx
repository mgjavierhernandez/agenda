import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGrade, useCreateGrade, useUpdateGrade } from '../hooks';
import { useStudents } from '@/modules/students/hooks';
import { useCourses } from '@/modules/courses/hooks';
import { useSubjects } from '@/modules/subjects/hooks';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { getErrorMessage } from '@/api/errors';
import type { GradeStatus, CreateGradeInput, UpdateGradeInput } from '@/api/types';

export function GradeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existingGrade, isLoading: isLoadingGrade } = useGrade(id ?? '');
  const createMutation = useCreateGrade();
  const updateMutation = useUpdateGrade();

  const { data: studentsData } = useStudents({ limit: 100 });
  const { data: coursesData } = useCourses({ limit: 100 });
  const { data: subjectsData } = useSubjects({ limit: 100 });

  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [value, setValue] = useState('');
  const [period, setPeriod] = useState('');
  const [evaluationType, setEvaluationType] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<GradeStatus>('ACTIVE');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  const students = studentsData?.data ?? [];
  const courses = coursesData?.data ?? [];
  const subjects = subjectsData?.data ?? [];

  useEffect(() => {
    if (existingGrade) {
      setStudentId(existingGrade.studentId);
      setCourseId(existingGrade.courseId);
      setSubjectId(existingGrade.subjectId);
      setValue(existingGrade.value);
      setPeriod(existingGrade.period);
      setEvaluationType(existingGrade.evaluationType ?? '');
      setDescription(existingGrade.description ?? '');
      setStatus(existingGrade.status);
    }
  }, [existingGrade]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!studentId.trim()) newErrors.studentId = 'El estudiante es requerido';
    if (!courseId.trim()) newErrors.courseId = 'El curso es requerido';
    if (!subjectId.trim()) newErrors.subjectId = 'La asignatura es requerida';
    const numValue = parseFloat(value);
    if (!value.trim()) newErrors.value = 'El valor es requerido';
    else if (isNaN(numValue) || numValue < 0 || numValue > 5) newErrors.value = 'El valor debe estar entre 0 y 5';
    if (!period.trim()) newErrors.period = 'El período es requerido';
    else if (period.length > 50) newErrors.period = 'Máximo 50 caracteres';
    if (evaluationType.length > 50) newErrors.evaluationType = 'Máximo 50 caracteres';
    if (description.length > 1000) newErrors.description = 'Máximo 1000 caracteres';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    try {
      const numValue = parseFloat(value);
      if (isEditing && id) {
        const payload: UpdateGradeInput = {
          studentId: studentId.trim(),
          courseId: courseId.trim(),
          subjectId: subjectId.trim(),
          value: numValue,
          period: period.trim(),
          status,
        };
        if (evaluationType.trim()) payload.evaluationType = evaluationType.trim();
        if (description.trim()) payload.description = description.trim();
        await updateMutation.mutateAsync({ id, data: payload });
        navigate(`/grades/${id}`);
      } else {
        const payload: CreateGradeInput = {
          studentId: studentId.trim(),
          courseId: courseId.trim(),
          subjectId: subjectId.trim(),
          value: numValue,
          period: period.trim(),
          status,
        };
        if (evaluationType.trim()) payload.evaluationType = evaluationType.trim();
        if (description.trim()) payload.description = description.trim();
        const created = await createMutation.mutateAsync(payload);
        navigate(`/grades/${created.id}`);
      }
    } catch (err) {
      setApiError(getErrorMessage(err) || 'Ocurrió un error inesperado');
    }
  };

  if (isEditing && isLoadingGrade) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEditing && !existingGrade) {
    return <ErrorState error={{ statusCode: 404, message: 'Calificación no encontrada', timestamp: '', path: '' }} />;
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={isEditing ? 'Editar calificación' : 'Nueva calificación'}
        description={isEditing ? 'Actualizar información de la calificación' : 'Registrar una nueva calificación'}
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {apiError && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <div>
            <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
              Estudiante *
            </label>
            <select
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={isSubmitting}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Seleccionar estudiante</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
            {errors.studentId && <p className="mt-1 text-sm text-red-600">{errors.studentId}</p>}
          </div>

          <div>
            <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 mb-1">
              Curso *
            </label>
            <select
              id="courseId"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={isSubmitting}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Seleccionar curso</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            {errors.courseId && <p className="mt-1 text-sm text-red-600">{errors.courseId}</p>}
          </div>

          <div>
            <label htmlFor="subjectId" className="block text-sm font-medium text-gray-700 mb-1">
              Asignatura *
            </label>
            <select
              id="subjectId"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={isSubmitting}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Seleccionar asignatura</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
            {errors.subjectId && <p className="mt-1 text-sm text-red-600">{errors.subjectId}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Valor (0–5) *"
              type="number"
              step="0.01"
              min="0"
              max="5"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              error={errors.value}
              disabled={isSubmitting}
              placeholder="Ej: 4.25"
            />

            <Input
              label="Período *"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              error={errors.period}
              disabled={isSubmitting}
              maxLength={50}
              placeholder="Ej: Q1"
            />
          </div>

          <Input
            label="Tipo de evaluación"
            value={evaluationType}
            onChange={(e) => setEvaluationType(e.target.value)}
            error={errors.evaluationType}
            disabled={isSubmitting}
            maxLength={50}
            placeholder="Ej: Parcial"
          />

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              maxLength={1000}
              rows={3}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Estado *
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as GradeStatus)}
              disabled={isSubmitting}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEditing ? `/grades/${id}` : '/grades')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? 'Guardar cambios' : 'Crear calificación'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
