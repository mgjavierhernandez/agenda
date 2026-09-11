import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useAuth } from '@/auth/auth.store';
import { useTenant } from '@/tenant/tenant.store';
import { useUpsertUserProfile } from '@/modules/administration/hooks';
import { apiClient } from '@/api/client';
import { getErrorMessage } from '@/api/errors';
import { PageHeader } from '@/components/feedback/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { DOCUMENT_TYPE_LABELS } from '@/api/types';
import type { UpsertUserProfileInput, DocumentType, UserProfile } from '@/api/types';

const DOCUMENT_TYPES: DocumentType[] = ['DNI', 'PASSPORT', 'NATIONAL_ID', 'OTHER'];

export function UserProfilePage() {
  const { user } = useAuth();
  const { selectedInstitutionId } = useTenant();
  const upsertProfile = useUpsertUserProfile(user?.id);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');

  const applyProfile = useCallback((data: UserProfile | null) => {
    setDocumentType((data?.documentType as DocumentType | null) ?? '');
    setDocumentNumber(data?.documentNumber ?? '');
    setBirthDate(data?.birthDate ? String(data.birthDate).slice(0, 10) : '');
    setPhone(data?.phone ?? '');
    setAddress(data?.address ?? '');
    setProfession(data?.profession ?? '');
    setBio(data?.bio ?? '');
    setIsDirty(false);
  }, []);

  const loadProfile = useCallback(async () => {
    if (!selectedInstitutionId || !user?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const data = await apiClient.get<UserProfile | null>(`/users/${user.id}/profile`);
      applyProfile(data);
    } catch (err) {
      setError(getErrorMessage(err) || 'No se pudo cargar el perfil');
    } finally {
      setIsLoading(false);
    }
  }, [selectedInstitutionId, user?.id, applyProfile]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleChange = (field: string, value: string) => {
    setIsDirty(true);
    setSaved(false);
    switch (field) {
      case 'documentType':
        setDocumentType(value as DocumentType | '');
        break;
      case 'documentNumber':
        setDocumentNumber(value);
        break;
      case 'birthDate':
        setBirthDate(value);
        break;
      case 'phone':
        setPhone(value);
        break;
      case 'address':
        setAddress(value);
        break;
      case 'profession':
        setProfession(value);
        break;
      case 'bio':
        setBio(value);
        break;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    const input: UpsertUserProfileInput = {
      documentType: documentType || undefined,
      documentNumber: documentNumber.trim() || undefined,
      birthDate: birthDate || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      profession: profession.trim() || undefined,
      bio: bio.trim() || undefined,
    };

    try {
      await upsertProfile.mutateAsync(input);
      setSaved(true);
      setIsDirty(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(getErrorMessage(err) || 'No se pudo guardar el perfil');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Mi perfil" description="Información personal y profesional" />
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos del usuario</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Correo</dt>
            <dd className="text-gray-900 font-medium">{user?.email ?? ''}</dd>
          </div>
        </dl>
      </Card>
      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">Perfil guardado correctamente.</p>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Perfil personal y profesional</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="documentType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Tipo de documento
              </label>
              <select
                id="documentType"
                value={documentType}
                onChange={(e) => handleChange('documentType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccione…</option>
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {DOCUMENT_TYPE_LABELS[dt]}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Número de documento"
              placeholder="Número de documento"
              value={documentNumber}
              onChange={(e) => handleChange('documentNumber', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)}
            />
            <Input
              label="Teléfono"
              placeholder="Teléfono"
              value={phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>
          <Input
            label="Dirección"
            placeholder="Dirección"
            value={address}
            onChange={(e) => handleChange('address', e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Profesión"
              placeholder="Profesión"
              value={profession}
              onChange={(e) => handleChange('profession', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              Perfil profesional / Bio
            </label>
            <textarea
              id="bio"
              rows={4}
              value={bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Descripción profesional, experiencia, etc."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              disabled={!isDirty}
              onClick={() => void loadProfile()}
            >
              Descartar
            </Button>
            <Button type="submit" isLoading={upsertProfile.isPending} disabled={!isDirty}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
