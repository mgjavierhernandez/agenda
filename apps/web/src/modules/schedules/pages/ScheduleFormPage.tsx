import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSchedule, useCreateSchedule, useUpdateSchedule } from '../hooks';
import { useCourses } from '@/modules/courses/hooks';
import { useSubjects } from '@/modules/subjects/hooks';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { getErrorMessage } from '@/api/errors';
import type { ScheduleStatus, DayOfWeek, CreateScheduleInput, UpdateScheduleInput } from '@/api/types';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function ScheduleFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existingSchedule, isLoading: isLoadingSchedule } = useSchedule(id ?? '');
  const createMutation = useCreateSchedule();
  const updateMutation = useUpdateSchedule();

  const { data: coursesData } = useCourses({ limit: 100 });
  const { data: subjectsData } = useSubjects({ limit: 100 });

  const [courseId, setCourseId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('MONDAY');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [classroom, setClassroom] = useState('');
  const [status, setStatus] = useState<ScheduleStatus>('ACTIVE');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  const courses = coursesData?.data ?? [];
  const subjects = subjectsData?.data ?? [];

  useEffect(() => {
    if (existingSchedule) {
      setCourseId(existingSchedule.courseId);
      setSubjectId(existingSchedule.subjectId);
      setDayOfWeek(existingSchedule.dayOfWeek);
      setStartTime(existingSchedule.startTime);
      setEndTime(existingSchedule.endTime);
      setClassroom(existingSchedule.classroom ?? '');
      setStatus(existingSchedule.status);
    }
  }, [existingSchedule]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!courseId.trim()) newErrors.courseId = 'El curso es requerido';
    if (!subjectId.trim()) newErrors.subjectId = 'La asignatura es requerida';
    if (!dayOfWeek) newErrors.dayOfWeek = 'El día es requerido';
    if (!startTime.trim()) {
      newErrors.startTime = 'La hora de inicio es requerida';
    } else if (!TIME_REGEX.test(startTime)) {
      newErrors.startTime = 'Formato de hora inválido (HH:MM)';
    }
    if (!endTime.trim()) {
      newErrors.endTime = 'La hora de fin es requerida';
    } else if (!TIME_REGEX.test(endTime)) {
      newErrors.endTime = 'Formato de hora inválido (HH:MM)';
    }
    if (startTime.trim() && endTime.trim() && TIME_REGEX.test(startTime) && TIME_REGEX.test(endTime)) {
      if (startTime >= endTime) {
        newErrors.endTime = 'La hora de fin debe ser posterior a la hora de inicio';
      }
    }
    if (classroom.length > 100) newErrors.classroom = 'Máximo 100 caracteres';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    try {
      if (isEditing && id) {
        const payload: UpdateScheduleInput = {
          courseId: courseId.trim(),
          subjectId: subjectId.trim(),
          dayOfWeek,
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          status,
        };
        if (classroom.trim()) payload.classroom = classroom.trim();
        await updateMutation.mutateAsync({ id, data: payload });
        navigate(`/schedules/${id}`);
      } else {
        const payload: CreateScheduleInput = {
          courseId: courseId.trim(),
          subjectId: subjectId.trim(),
          dayOfWeek,
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          status,
        };
        if (classroom.trim()) payload.classroom = classroom.trim();
        const created = await createMutation.mutateAsync(payload);
        navigate(`/schedules/${created.id}`);
      }
    } catch (err) {
      setApiError(getErrorMessage(err) || 'Ocurrió un error inesperado');
    }
  };

  if (isEditing && isLoadingSchedule) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEditing && !existingSchedule) {
    return <ErrorState error={{ statusCode: 404, message: 'Horario no encontrado', timestamp: '', path: '' }} />;
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={isEditing ? 'Editar horario' : 'Nuevo horario'}
        description={isEditing ? 'Actualizar información del horario' : 'Registrar un nuevo horario de clases'}
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {apiError && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

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

          <div>
            <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700 mb-1">
              Día de la semana *
            </label>
            <select
              id="dayOfWeek"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
              disabled={isSubmitting}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="MONDAY">Lunes</option>
              <option value="TUESDAY">Martes</option>
              <option value="WEDNESDAY">Miércoles</option>
              <option value="THURSDAY">Jueves</option>
              <option value="FRIDAY">Viernes</option>
              <option value="SATURDAY">Sábado</option>
              <option value="SUNDAY">Domingo</option>
            </select>
            {errors.dayOfWeek && <p className="mt-1 text-sm text-red-600">{errors.dayOfWeek}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hora de inicio *"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              error={errors.startTime}
              disabled={isSubmitting}
              placeholder="HH:MM"
              maxLength={5}
            />
            <Input
              label="Hora de fin *"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              error={errors.endTime}
              disabled={isSubmitting}
              placeholder="HH:MM"
              maxLength={5}
            />
          </div>

          <Input
            label="Aula"
            value={classroom}
            onChange={(e) => setClassroom(e.target.value)}
            error={errors.classroom}
            disabled={isSubmitting}
            maxLength={100}
            placeholder="Ej: Aula 101"
          />

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Estado *
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ScheduleStatus)}
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
              onClick={() => navigate(isEditing ? `/schedules/${id}` : '/schedules')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? 'Guardar cambios' : 'Crear horario'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
