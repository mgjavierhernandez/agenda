import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudent, useCreateStudent, useUpdateStudent } from '../hooks';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { getErrorMessage } from '@/api/errors';
import type { DocumentType, CreateStudentInput, UpdateStudentInput } from '@/api/types';

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'DNI', label: 'Cédula de Ciudadanía (DNI)' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'NATIONAL_ID', label: 'Tarjeta de Identidad' },
  { value: 'OTHER', label: 'Otro' },
];

export function StudentFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existingStudent, isLoading: isLoadingStudent } = useStudent(id ?? '');
  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (existingStudent) {
      setFirstName(existingStudent.firstName);
      setLastName(existingStudent.lastName);
      setDocumentType(existingStudent.documentType);
      setDocumentNumber(existingStudent.documentNumber);
      setDateOfBirth(existingStudent.dateOfBirth?.split('T')[0] ?? '');
    }
  }, [existingStudent]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'El nombre es requerido';
    else if (firstName.length > 100) newErrors.firstName = 'Máximo 100 caracteres';
    if (!lastName.trim()) newErrors.lastName = 'El apellido es requerido';
    else if (lastName.length > 100) newErrors.lastName = 'Máximo 100 caracteres';
    if (!documentNumber.trim()) newErrors.documentNumber = 'El número de documento es requerido';
    else if (documentNumber.length > 50) newErrors.documentNumber = 'Máximo 50 caracteres';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    try {
      if (isEditing && id) {
        const payload: UpdateStudentInput = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          documentType,
          documentNumber: documentNumber.trim(),
        };
        if (dateOfBirth) payload.dateOfBirth = dateOfBirth;
        await updateMutation.mutateAsync({ id, data: payload });
        navigate(`/students/${id}`);
      } else {
        const payload: CreateStudentInput = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          documentType,
          documentNumber: documentNumber.trim(),
        };
        if (dateOfBirth) payload.dateOfBirth = dateOfBirth;
        const created = await createMutation.mutateAsync(payload);
        navigate(`/students/${created.id}`);
      }
    } catch (err) {
      setApiError(getErrorMessage(err) || 'Ocurrió un error inesperado');
    }
  };

  if (isEditing && isLoadingStudent) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEditing && !existingStudent) {
    return <ErrorState error={{ statusCode: 404, message: 'Estudiante no encontrado', timestamp: '', path: '' }} />;
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={isEditing ? 'Editar estudiante' : 'Nuevo estudiante'}
        description={isEditing ? 'Actualizar información del estudiante' : 'Registrar un nuevo estudiante'}
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {apiError && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <Input
            label="Nombre *"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={errors.firstName}
            disabled={isSubmitting}
            maxLength={100}
          />

          <Input
            label="Apellido *"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={errors.lastName}
            disabled={isSubmitting}
            maxLength={100}
          />

          <div>
            <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de documento *
            </label>
            <select
              id="documentType"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              disabled={isSubmitting}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Número de documento *"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            error={errors.documentNumber}
            disabled={isSubmitting}
            maxLength={50}
          />

          <Input
            label="Fecha de nacimiento"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            disabled={isSubmitting}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEditing ? `/students/${id}` : '/students')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? 'Guardar cambios' : 'Crear estudiante'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
