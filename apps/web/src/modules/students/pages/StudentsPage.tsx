import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudents } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { useParentStudentFilter } from '@/modules/children';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';

export function StudentsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('students:manage' as never);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Padres: solo ven a sus hijos vinculados (scope aplicado en backend).
  const { isParent } = useParentStudentFilter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error, refetch } = useStudents({
    page,
    limit,
    search: debouncedSearch || undefined,
  });

  const students = data?.data ?? [];
  const meta = data?.meta;

  const handleClearSearch = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  }, []);

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estudiantes"
        description={
          isParent
            ? 'Tus hijos vinculados a la institución'
            : 'Gestionar estudiantes de la institución'
        }
        actions={
          canCreate ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate('/students/import')}>
                Importar
              </Button>
              <Button onClick={() => navigate('/students/new')}>Nuevo estudiante</Button>
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Buscar por nombre, apellido o documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {debouncedSearch && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="text-sm text-blue-600 hover:text-blue-800 self-end mb-1"
          >
            Limpiar búsqueda
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          title={
            debouncedSearch ? 'No se encontraron estudiantes' : 'No hay estudiantes registrados'
          }
          description={
            debouncedSearch
              ? 'No encontramos estudiantes que coincidan con tu búsqueda.'
              : 'Comienza agregando estudiantes a la institución.'
          }
          action={
            canCreate && !debouncedSearch ? (
              <Button onClick={() => navigate('/students/new')}>Nuevo estudiante</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Card padding="none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Documento</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha nac.</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {student.documentType}: {student.documentNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {student.dateOfBirth
                          ? new Date(student.dateOfBirth).toLocaleDateString('es-CO')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={student.status === 'ACTIVE' ? 'success' : 'default'}>
                          {student.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/students/${student.id}`)}
                          >
                            Ver
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {students.map((student) => (
              <Card key={student.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {student.documentType}: {student.documentNumber}
                    </p>
                    {student.dateOfBirth && (
                      <p className="text-sm text-gray-500">
                        Nac: {new Date(student.dateOfBirth).toLocaleDateString('es-CO')}
                      </p>
                    )}
                  </div>
                  <Badge variant={student.status === 'ACTIVE' ? 'success' : 'default'}>
                    {student.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/students/${student.id}`)}
                  >
                    Ver detalle
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Mostrando {(meta.page - 1) * meta.limit + 1}–
                {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span className="flex items-center px-3 text-gray-700">
                  Página {meta.page} de {meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
