import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTask, useCreateTask, useUpdateTask } from '../hooks';
import { useCourses } from '@/modules/courses/hooks';
import { useSubjects } from '@/modules/subjects/hooks';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { getErrorMessage } from '@/api/errors';

export function TaskFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existingTask, isLoading: isLoadingTask } = useTask(id ?? '');
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();

  const { data: coursesData } = useCourses({ limit: 100 });
  const { data: subjectsData } = useSubjects({ limit: 100 });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  const courses = coursesData?.data ?? [];
  const subjects = subjectsData?.data ?? [];

  useEffect(() => {
    if (existingTask) {
      if (existingTask.status !== 'DRAFT') {
        navigate(`/tasks/${id}`);
        return;
      }
      setTitle(existingTask.title);
      setDescription(existingTask.description ?? '');
      setCourseId(existingTask.courseId);
      setSubjectId(existingTask.subjectId);
      const dateObj = new Date(existingTask.dueDate);
      const localDatetime = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDueDate(localDatetime);
    }
  }, [existingTask, id, navigate]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = 'El título es requerido';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Mínimo 3 caracteres';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Máximo 200 caracteres';
    }
    if (description.length > 5000) newErrors.description = 'Máximo 5000 caracteres';
    if (!courseId.trim()) newErrors.courseId = 'El curso es requerido';
    if (!subjectId.trim()) newErrors.subjectId = 'La asignatura es requerida';
    if (!dueDate.trim()) {
      newErrors.dueDate = 'La fecha límite es requerida';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    try {
      const dueDateIso = new Date(dueDate).toISOString();
      if (isEditing && id) {
        await updateMutation.mutateAsync({
          id,
          data: {
            title: title.trim(),
            description: description.trim() || undefined,
            courseId: courseId.trim(),
            subjectId: subjectId.trim(),
            dueDate: dueDateIso,
          },
        });
        navigate(`/tasks/${id}`);
      } else {
        const created = await createMutation.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          courseId: courseId.trim(),
          subjectId: subjectId.trim(),
          dueDate: dueDateIso,
        });
        navigate(`/tasks/${created.id}`);
      }
    } catch (err) {
      setApiError(getErrorMessage(err) || 'Ocurrió un error inesperado');
    }
  };

  if (isEditing && isLoadingTask) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEditing && !existingTask) {
    return <ErrorState error={{ statusCode: 404, message: 'Tarea no encontrada', timestamp: '', path: '' }} />;
  }

  if (isEditing && existingTask && existingTask.status !== 'DRAFT') {
    return <ErrorState error={{ statusCode: 400, message: 'Solo las tareas en borrador pueden editarse', timestamp: '', path: '' }} />;
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={isEditing ? 'Editar tarea' : 'Nueva tarea'}
        description={isEditing ? 'Actualizar información de la tarea' : 'Registrar una nueva tarea académica'}
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {apiError && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <Input
            label="Título *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            disabled={isSubmitting}
            maxLength={200}
            placeholder="Ej: Ejercicios de álgebra"
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
              maxLength={5000}
              rows={4}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
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

          <Input
            label="Fecha límite *"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            error={errors.dueDate}
            disabled={isSubmitting}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEditing ? `/tasks/${id}` : '/tasks')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? 'Guardar cambios' : 'Crear tarea'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
