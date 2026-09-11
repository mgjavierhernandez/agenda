import { useState, type FormEvent } from 'react';
import {
  useFollowUpCategories,
  useCreateFollowUpCategory,
  useUpdateFollowUpCategory,
  useDeleteFollowUpCategory,
} from '../hooks';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { getErrorMessage } from '@/api/errors';

export function FollowUpCategoriesPage() {
  const { data: categories = [], isLoading, error } = useFollowUpCategories();
  const createMutation = useCreateFollowUpCategory();
  const updateMutation = useUpdateFollowUpCategory();
  const deleteMutation = useDeleteFollowUpCategory();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setErrors({});
    setApiError('');
    setShowForm(false);
  };

  const handleEdit = (category: { id: string; name: string; description: string | null }) => {
    setEditingId(category.id);
    setName(category.name);
    setDescription(category.description ?? '');
    setErrors({});
    setApiError('');
    setShowForm(true);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (name.trim().length < 1) {
      newErrors.name = 'Mínimo 1 carácter';
    } else if (name.trim().length > 100) {
      newErrors.name = 'Máximo 100 caracteres';
    }
    if (description.length > 500) {
      newErrors.description = 'Máximo 500 caracteres';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          data: {
            name: name.trim(),
            description: description.trim() || undefined,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
        });
      }
      resetForm();
    } catch (err) {
      setApiError(getErrorMessage(err) || 'Ocurrió un error inesperado');
    }
  };

  const handleDelete = async (id: string, categoryName: string) => {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${categoryName}"?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      alert(getErrorMessage(err) || 'Error al eliminar la categoría');
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Categorías del Observador"
        description="Gestiona las categorías para los seguimientos de estudiantes"
        actions={
          <Button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
          >
            {showForm ? 'Cancelar' : 'Nueva categoría'}
          </Button>
        }
      />

      {showForm && (
        <Card>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            {editingId ? 'Editar categoría' : 'Crear categoría'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {apiError && (
              <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {apiError}
              </div>
            )}

            <Input
              label="Nombre *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              disabled={isSubmitting}
              maxLength={100}
              placeholder="Ej: Académico"
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
                maxLength={500}
                rows={2}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Descripción opcional de la categoría..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={resetForm} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingId ? 'Guardar cambios' : 'Crear categoría'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          title="No hay categorías"
          description="Crea categorías para organizar los seguimientos de estudiantes."
          action={
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              Nueva categoría
            </Button>
          }
        />
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Descripción</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                    {cat.description || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        cat.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cat.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cat.id, cat.name)}
                        disabled={deleteMutation.isPending}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
