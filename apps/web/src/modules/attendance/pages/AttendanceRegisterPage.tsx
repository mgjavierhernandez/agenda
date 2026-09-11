import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourses } from '@/modules/courses/hooks';
import { useAcademicPeriods } from '@/modules/academic-periods/hooks';
import { useStudents } from '@/modules/students/hooks';
import { useEnrollments } from '@/modules/enrollments/hooks';
import { useAttendances, useBulkCreateAttendance } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { getErrorMessage } from '@/api/errors';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { ATTENDANCE_STATUS_LABELS } from '@/api/types';
import type { AcademicPeriod, AttendanceStatus } from '@/api/types';

const STATUS_OPTIONS: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

interface RowState {
  status: AttendanceStatus;
  notes: string;
}

export function AttendanceRegisterPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canRegister = hasPermission(PERMISSIONS.ATTENDANCE_CREATE);

  const [courseId, setCourseId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const { data: coursesData, isLoading: coursesLoading } = useCourses({ limit: 200 });
  const { data: periodsData, isLoading: periodsLoading } = useAcademicPeriods({ limit: 200 });
  const { data: studentsData } = useStudents({ limit: 300 });

  const { data: enrollData, isLoading: enrollLoading } = useEnrollments(
    courseId && periodId ? { courseId, academicPeriodId: periodId, limit: 200 } : { limit: 1 },
  );
  const { data: existingData, isLoading: existingLoading } = useAttendances(
    courseId && date ? { courseId, date, limit: 200 } : { limit: 1 },
  );

  const selectedPeriod: AcademicPeriod | undefined = useMemo(
    () => periodsData?.data.find((p) => p.id === periodId),
    [periodsData, periodId],
  );
  const isClosed = selectedPeriod?.status === 'CLOSED';

  const enrolledStudents = useMemo(() => {
    const ids = new Set((enrollData?.data ?? []).map((e) => e.studentId));
    return (studentsData?.data ?? []).filter((s) => ids.has(s.id));
  }, [enrollData, studentsData]);

  useEffect(() => {
    if (!courseId) return;
    const existingByStudent = new Map<string, AttendanceStatus>();
    for (const a of existingData?.data ?? []) existingByStudent.set(a.studentId, a.status);
    const next: Record<string, RowState> = {};
    for (const s of enrolledStudents) {
      next[s.id] = { status: existingByStudent.get(s.id) ?? 'PRESENT', notes: '' };
    }
    setRows(next);
  }, [courseId, enrolledStudents, existingData]);

  const bulkCreate = useBulkCreateAttendance();

  const handleSave = async () => {
    if (!courseId || !periodId || !date) return;
    setFormError(null);
    const records = Object.entries(rows).map(([studentId, row]) => ({
      studentId,
      status: row.status,
      notes: row.notes || null,
    }));
    try {
      const result = await bulkCreate.mutateAsync({
        courseId,
        academicPeriodId: periodId,
        date,
        records,
      });
      navigate('/attendance', { state: { success: true, created: result.created } });
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

  const setRow = (studentId: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));
  };

  const canSubmit = canRegister && courseId && periodId && date && !isClosed;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registrar asistencia"
        description="Selecciona el curso, periodo y fecha para registrar la asistencia"
        actions={
          <Button variant="ghost" onClick={() => navigate('/attendance')}>
            Volver
          </Button>
        }
      />

      {!canRegister && (
        <Card>
          <p className="text-sm text-gray-600">
            No tienes permisos para registrar asistencia. Consulta el listado de asistencias en la
            sección Asistencia.
          </p>
        </Card>
      )}

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="reg-course" className="block text-sm font-medium text-gray-700 mb-1">
              Curso
            </label>
            <select
              id="reg-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={coursesLoading || !canRegister}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Selecciona un curso</option>
              {coursesData?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="reg-period" className="block text-sm font-medium text-gray-700 mb-1">
              Periodo académico
            </label>
            <select
              id="reg-period"
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              disabled={periodsLoading || !canRegister}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Selecciona un periodo</option>
              {periodsData?.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.status === 'CLOSED' ? ' (Cerrado)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="reg-date" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha
            </label>
            <input
              id="reg-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!canRegister}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>

        {isClosed && (
          <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            El periodo académico seleccionado está cerrado, por lo que no se pueden modificar
            registros de asistencia.
          </div>
        )}
      </Card>

      {courseId && periodId && date ? (
        enrollLoading || existingLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : enrolledStudents.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-600">
              No hay estudiantes matriculados en este curso para el periodo seleccionado.
            </p>
          </Card>
        ) : (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                {enrolledStudents.length} estudiante(s) matriculado(s)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setRows((prev) => {
                      const next: Record<string, RowState> = {};
                      for (const k of Object.keys(prev))
                        next[k] = { ...prev[k], status: 'PRESENT' };
                      return next;
                    })
                  }
                  disabled={!canSubmit}
                >
                  Todo presente
                </Button>
              </div>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estudiante</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Asistencia</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledStudents.map((student) => {
                    const row = rows[student.id];
                    return (
                      <tr key={student.id} className="border-b border-gray-100">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="px-4 py-3 w-44">
                          <select
                            value={row?.status ?? 'PRESENT'}
                            disabled={isClosed || !canRegister}
                            onChange={(e) =>
                              setRow(student.id, { status: e.target.value as AttendanceStatus })
                            }
                            className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {STATUS_OPTIONS.map((st) => (
                              <option key={st} value={st}>
                                {ATTENDANCE_STATUS_LABELS[st]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row?.notes ?? ''}
                            maxLength={1000}
                            disabled={isClosed || !canRegister}
                            onChange={(e) => setRow(student.id, { notes: e.target.value })}
                            placeholder="Notas (opcional)"
                            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {enrolledStudents.map((student) => {
                const row = rows[student.id];
                return (
                  <div key={student.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <p className="font-medium text-gray-900">
                      {student.firstName} {student.lastName}
                    </p>
                    <select
                      value={row?.status ?? 'PRESENT'}
                      disabled={isClosed || !canRegister}
                      onChange={(e) =>
                        setRow(student.id, { status: e.target.value as AttendanceStatus })
                      }
                      className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {ATTENDANCE_STATUS_LABELS[st]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={row?.notes ?? ''}
                      maxLength={1000}
                      disabled={isClosed || !canRegister}
                      onChange={(e) => setRow(student.id, { notes: e.target.value })}
                      placeholder="Notas (opcional)"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                );
              })}
            </div>

            {formError && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button onClick={handleSave} isLoading={bulkCreate.isPending} disabled={!canSubmit}>
                Guardar asistencia
              </Button>
            </div>
            {bulkCreate.isSuccess && (
              <div className="mt-3 text-sm text-green-700">Asistencia guardada correctamente.</div>
            )}
          </Card>
        )
      ) : (
        <Card>
          <p className="text-sm text-gray-600">
            Selecciona un curso, un periodo académico y una fecha para cargar los estudiantes.
          </p>
        </Card>
      )}
    </div>
  );
}
