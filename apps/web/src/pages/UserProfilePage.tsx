import { useState, type FormEvent } from 'react';
import { useAuth } from '@/auth/auth.store';
import { useUpsertUserProfile } from '@/modules/administration/hooks';
import { getErrorMessage } from '@/api/errors';
import { PageHeader } from '@/components/feedback/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from '@/api/types';
import type { UserProfile, UpsertUserProfileInput } from '@/api/types';

export function UserProfilePage() {
  const { user, selectedInstitutionId } = useAuth();
  const upsertProfile = useUpsertUserProfile(user?.id);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');

  const loadProfile = async () => {
    if (!selectedInstitutionId || !user?.id) return;
    try {
      const res = await fetch(`/api/v1/users/${user.id}/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setFirstName(data.firstName ?? '');
        setLastName(data.lastName ?? '');
        setDocumentType(data.documentType ?? '');
        setDocumentNumber(data.documentNumber ?? '');
        setBirthDate(data.birthDate ?? '');
        setPhone(data.phone ?? '');
        setAddress(data.address ?? '');
        setProfession(data.profession ?? '');
        setBio(data.bio ?? '');
      }
    } catch {
      setError('No se pudo cargar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setIsDirty(true);
    setSaved(false);
    switch (field) {
      case 'firstName':
        setFirstName(value);
        break;
      case 'lastName':
        setLastName(value);
        break;
      case 'documentType':
        setDocumentType(value);
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
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
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
      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">Perfil guardado correctamente.</p>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombres"
              placeholder="Nombres"
              value={firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              required
            />
            <Input
              label="Apellidos"
              placeholder="Apellidos"
              value={lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 mb-1">
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
                  <option key={dt} value={dt}>{DOCUMENT_TYPE_LABELS[dt]}</option>
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
            <Button type="button" variant="secondary" disabled={!isDirty} onClick={loadProfile}>
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