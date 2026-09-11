import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImportStudents } from '../hooks';
import { useCourses } from '@/modules/courses/hooks';
import { useAcademicPeriods } from '@/modules/academic-periods/hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { getErrorMessage } from '@/api/errors';
import { PageHeader } from '@/components/feedback/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { PERMISSIONS } from '@/permissions/permission.constants';
import type { ImportStudentsResult } from '@/api/types';

export function StudentImportPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.STUDENTS_MANAGE);

  const [file, setFile] = useState<File | null>(null);
  const [courseId, setCourseId] = useState('');
  const [academicPeriodId, setAcademicPeriodId] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportStudentsResult | null>(null);

  const importMutation = useImportStudents();
  const { data: coursesData } = useCourses({ limit: 100, status: 'ACTIVE' });
  const { data: periodsData } = useAcademicPeriods({ limit: 100 });

  if (!canManage) {
    return (
      <Card>
        <p className="text-gray-600">No tienes permisos para importar estudiantes.</p>
      </Card>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!file) {
      setError('Selecciona un archivo CSV o XLSX (máx. 5 MB)');
      return;
    }
    try {
      const summary = await importMutation.mutateAsync({
        file,
        ...(courseId ? { courseId } : {}),
        ...(academicPeriodId ? { academicPeriodId } : {}),
      });
      setResult(summary);
    } catch (err) {
      setError(getErrorMessage(err) || 'No fue posible importar el archivo');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar estudiantes"
        description="Carga masiva desde CSV o XLSX. Columnas: firstName, lastName, documentType, documentNumber, dateOfBirth, courseCode, status"
        actions={
          <Button variant="secondary" onClick={() => navigate('/students')}>
            Volver
          </Button>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Archivo (CSV o XLSX, máx. 5 MB)"
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="defaultCourse"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Curso por defecto (opcional)
              </label>
              <select
                id="defaultCourse"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Usar courseCode de cada fila</option>
                {(coursesData?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="academicPeriod"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Periodo académico (opcional)
              </label>
              <select
                id="academicPeriod"
                value={academicPeriodId}
                onChange={(e) => setAcademicPeriodId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Detectar periodo ACTIVE único</option>
                {(periodsData?.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
              role="alert"
            >
              {error}
            </div>
          )}
          <Button type="submit" isLoading={importMutation.isPending}>
            Importar
          </Button>
        </form>
      </Card>

      {importMutation.isPending && (
        <div className="flex justify-center py-6">
          <Spinner size="lg" />
        </div>
      )}

      {result && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultado</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="success">Creados: {result.created}</Badge>
            <Badge variant="default">Matrículas: {result.enrollments}</Badge>
            <Badge variant={result.errors.length > 0 ? 'danger' : 'default'}>
              Errores: {result.errors.length}
            </Badge>
          </div>
          {result.errors.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Fila</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Campo</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-4 py-2">{e.row}</td>
                      <td className="px-4 py-2">{e.field}</td>
                      <td className="px-4 py-2 text-red-700">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
