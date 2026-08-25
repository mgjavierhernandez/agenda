import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateTaskAssignment } from '../hooks';
import { useTasks } from '@/modules/tasks/hooks';
import { useStudents } from '@/modules/students/hooks';
import { PageHeader } from '@/components/feedback/PageHeader';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { getErrorMessage } from '@/api/errors';

export function TaskAssignmentFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreateTaskAssignment();

  const { data: tasksData, isLoading: isLoadingTasks } = useTasks({ limit: 100, status: 'PUBLISHED' });
  const { data: studentsData, isLoading: isLoadingStudents } = useStudents({ limit: 100 });

  const tasks = tasksData?.data ?? [];
  const students = studentsData?.data ?? [];

  const [taskId, setTaskId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!taskId.trim()) newErrors.taskId = 'La tarea es requerida';
    if (selectedStudentIds.length === 0) newErrors.studentIds = 'Selecciona al menos un estudiante';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
    if (errors.studentIds) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.studentIds;
        return next;
      });
    }
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    try {
      const result = await createMutation.mutateAsync({
        taskId: taskId.trim(),
        studentIds: selectedStudentIds.length > 0 ? selectedStudentIds : undefined,
      });
      if (Array.isArray(result) && result.length > 0) {
        navigate(`/task-assignments/${result[0].id}`);
      } else {
        navigate('/task-assignments');
      }
    } catch (err) {
      setApiError(getErrorMessage(err) || 'Ocurrió un error inesperado');
    }
  };

  if (isLoadingTasks || isLoadingStudents) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const isSubmitting = createMutation.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Nueva asignación"
        description="Asignar una tarea a estudiantes"
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {apiError && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <div>
            <label htmlFor="taskId" className="block text-sm font-medium text-gray-700 mb-1">
              Tarea *
            </label>
            <select
              id="taskId"
              value={taskId}
              onChange={(e) => {
                setTaskId(e.target.value);
                if (errors.taskId) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.taskId;
                    return next;
                  });
                }
              }}
              disabled={isSubmitting}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Seleccionar tarea publicada</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            {errors.taskId && <p className="mt-1 text-sm text-red-600">{errors.taskId}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Estudiantes *
              </label>
              {students.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllStudents}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  disabled={isSubmitting}
                >
                  {selectedStudentIds.length === students.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              )}
            </div>
            {students.length === 0 ? (
              <p className="text-sm text-gray-500">No hay estudiantes disponibles</p>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                {students.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={() => handleStudentToggle(student.id)}
                      disabled={isSubmitting}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">
                      {student.firstName} {student.lastName}
                    </span>
                    <span className="text-xs text-gray-400 font-mono ml-auto">
                      {student.documentNumber}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {selectedStudentIds.length > 0 && (
              <p className="mt-1 text-sm text-gray-500">
                {selectedStudentIds.length} estudiante{selectedStudentIds.length !== 1 ? 's' : ''} seleccionado{selectedStudentIds.length !== 1 ? 's' : ''}
              </p>
            )}
            {errors.studentIds && <p className="mt-1 text-sm text-red-600">{errors.studentIds}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/task-assignments')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Crear asignación
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
