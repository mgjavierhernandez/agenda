import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudentFollowUp, useCreateStudentFollowUp, useUpdateStudentFollowUp, useFollowUpCategories } from '../hooks';
import { useStudents } from '@/modules/students/hooks';
import { PermissionGate } from '@/permissions/PermissionGate';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { getErrorMessage } from '@/api/errors';
import type { FollowUpType, FollowUpSeverity, FollowUpConfidentiality } from '@/api/types';

export function StudentFollowUpFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existingFollowUp, isLoading: isLoadingFollowUp } = useStudentFollowUp(id ?? '');
  const createMutation = useCreateStudentFollowUp();
  const updateMutation = useUpdateStudentFollowUp();
  const { data: studentsData } = useStudents({ limit: 200 });
  const { data: categories = [] } = useFollowUpCategories();

  const [studentId, setStudentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<FollowUpType>('ACADEMICO');
  const [severity, setSeverity] = useState<FollowUpSeverity>('MEDIUM');
  const [confidentiality, setConfidentiality] = useState<FollowUpConfidentiality>('INTERNAL');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  const students = studentsData?.data ?? [];

  useEffect(() => {
    if (existingFollowUp) {
      if (existingFollowUp.status === 'CLOSED') {
        navigate(`/student-follow-ups/${id}`);
        return;
      }
      setStudentId(existingFollowUp.studentId);
      setCategoryId(existingFollowUp.categoryId ?? '');
      setType(existingFollowUp.type);
      setSeverity(existingFollowUp.severity);
      setConfidentiality(existingFollowUp.confidentiality);
      setTitle(existingFollowUp.title);
      setSummary(existingFollowUp.summary ?? '');
      setDescription(existingFollowUp.description ?? '');
    }
  }, [existingFollowUp, id, navigate]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!isEditing && !studentId.trim()) {
      newErrors.studentId = 'El estudiante es requerido';
    }
    if (!title.trim()) {
      newErrors.title = 'El título es requerido';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Mínimo 3 caracteres';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Máximo 200 caracteres';
    }
    if (summary.length > 500) {
      newErrors.summary = 'Máximo 500 caracteres';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({
          id,
          data: {
            type,
            severity,
            confidentiality,
            categoryId: categoryId || null,
            title: title.trim(),
            summary: summary.trim() || undefined,
            description: description.trim() || undefined,
          },
        });
        navigate(`/student-follow-ups/${id}`);
      } else {
        const created = await createMutation.mutateAsync({
          studentId: studentId.trim(),
          type,
          severity,
          confidentiality,
          categoryId: categoryId || undefined,
          title: title.trim(),
          summary: summary.trim() || undefined,
          description: description.trim() || undefined,
        });
        navigate(`/student-follow-ups/${created.id}`);
      }
    } catch (err) {
      setApiError(getErrorMessage(err) || 'Ocurrió un error inesperado');
    }
  };

  if (isEditing && isLoadingFollowUp) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEditing && !existingFollowUp) {
    return <ErrorState error={{ statusCode: 404, message: 'Seguimiento no encontrado', timestamp: '', path: '' }} />;
  }

  if (isEditing && existingFollowUp && existingFollowUp.status === 'CLOSED') {
    return <ErrorState error={{ statusCode: 400, message: 'No se pueden editar seguimientos cerrados', timestamp: '', path: '' }} />;
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <PermissionGate permission={PERMISSIONS.STUDENT_FOLLOW_UPS_CREATE} fallback={<ErrorState error={{ statusCode: 403, message: 'No tienes permiso para crear seguimientos', timestamp: '', path: '' }} />}>
      <div className="space-y-6 max-w-2xl">
        <PageHeader
          title={isEditing ? 'Editar seguimiento' : 'Nuevo seguimiento'}
          description={isEditing ? 'Actualizar información del seguimiento' : 'Registrar un nuevo seguimiento de observador del alumno'}
        />

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {apiError && (
              <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {apiError}
              </div>
            )}

            {!isEditing && (
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
            )}

            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                id="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={isSubmitting}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">Sin categoría</option>
                {categories.filter((c) => c.active).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo *
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as FollowUpType)}
                disabled={isSubmitting}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="ACADEMICO">Académico</option>
                <option value="CONVIVENCIA">Convivencia</option>
                <option value="FORMATIVO">Formativo</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
                  Severidad
                </label>
                <select
                  id="severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as FollowUpSeverity)}
                  disabled={isSubmitting}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </div>
              <div>
                <label htmlFor="confidentiality" className="block text-sm font-medium text-gray-700 mb-1">
                  Confidencialidad
                </label>
                <select
                  id="confidentiality"
                  value={confidentiality}
                  onChange={(e) => setConfidentiality(e.target.value as FollowUpConfidentiality)}
                  disabled={isSubmitting}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="PUBLIC">Público</option>
                  <option value="INTERNAL">Interno</option>
                  <option value="CONFIDENTIAL">Confidencial</option>
                  <option value="SENSITIVE">Sensible</option>
                </select>
              </div>
            </div>

            <Input
              label="Título *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={errors.title}
              disabled={isSubmitting}
              maxLength={200}
              placeholder="Ej: Situación académica en matemáticas"
            />

            <div>
              <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">
                Resumen
              </label>
              <textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                disabled={isSubmitting}
                maxLength={500}
                rows={2}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Resumen breve de la situación..."
              />
              {errors.summary && <p className="mt-1 text-sm text-red-600">{errors.summary}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={4}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Descripción detallada de la situación..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(isEditing ? `/student-follow-ups/${id}` : '/student-follow-ups')}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {isEditing ? 'Guardar cambios' : 'Crear seguimiento'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PermissionGate>
  );
}
