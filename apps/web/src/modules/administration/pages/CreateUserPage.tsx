import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/auth.store';
import { useCreateUser, useLinkUser, useRoles } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { DOCUMENT_TYPE_LABELS, type DocumentType, type UpsertUserProfileInput } from '@/api/types';

interface FormErrors {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  document?: string;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'Ocurrió un error inesperado.';
}

export function CreateUserPage() {
  const navigate = useNavigate();
  const { selectedInstitutionId } = useAuth();
  const { hasPermission } = usePermissions();
  const canLink = hasPermission(PERMISSIONS.MEMBERSHIPS_MANAGE);

  const createUser = useCreateUser();
  const linkUser = useLinkUser(selectedInstitutionId);
  const { data: roles = [] } = useRoles();

  const assignableRoles = roles.filter((r) => r.assignable);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');

  if (!hasPermission(PERMISSIONS.USERS_CREATE)) {
    return (
      <Card>
        <p className="text-gray-600">No tienes permisos para crear usuarios.</p>
      </Card>
    );
  }

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }
    if (!password || password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!firstName.trim()) newErrors.firstName = 'El nombre es requerido';
    if (!lastName.trim()) newErrors.lastName = 'El apellido es requerido';
    if ((documentType && !documentNumber.trim()) || (!documentType && documentNumber.trim())) {
      newErrors.document = 'El tipo y el número de documento deben indicarse juntos';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildProfile = (): UpsertUserProfileInput | undefined => {
    const profile: UpsertUserProfileInput = {};
    if (documentType && documentNumber.trim()) {
      profile.documentType = documentType;
      profile.documentNumber = documentNumber.trim();
    }
    if (birthDate) profile.birthDate = birthDate;
    if (phone.trim()) profile.phone = phone.trim();
    if (address.trim()) profile.address = address.trim();
    if (profession.trim()) profile.profession = profession.trim();
    if (bio.trim()) profile.bio = bio.trim();
    return Object.keys(profile).length > 0 ? profile : undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    try {
      const profile = buildProfile();
      const user = await createUser.mutateAsync({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(profile ? { profile } : {}),
      });

      if (canLink && selectedInstitutionId && selectedRoles.length > 0) {
        const membership = await linkUser.mutateAsync({ userId: user.id, roleIds: selectedRoles });
        navigate(`/admin/users/${membership.id}`);
      } else {
        navigate('/admin/users');
      }
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const isPending = createUser.isPending || (canLink && linkUser.isPending);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo usuario"
        description="Crear una cuenta de usuario y vincularla a la institución"
      />

      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos de la cuenta</h3>
          <div className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="usuario@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}

            <PasswordInput
              label="Contraseña"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Nombre"
                  placeholder="Nombre"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <Input
                  label="Apellido"
                  placeholder="Apellido"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                {errors.lastName && <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos personales</h3>
          <div className="space-y-4">
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
                  onChange={(e) => setDocumentType(e.target.value as DocumentType | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccione…</option>
                  {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((dt) => (
                    <option key={dt} value={dt}>
                      {DOCUMENT_TYPE_LABELS[dt]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Input
                  label="Número de documento"
                  placeholder="Número de documento"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                />
              </div>
            </div>
            {errors.document && <p className="text-sm text-red-600">{errors.document}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Fecha de nacimiento"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
              <Input
                label="Teléfono"
                placeholder="Teléfono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <Input
              label="Dirección"
              placeholder="Dirección"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos profesionales</h3>
          <div className="space-y-4">
            <Input
              label="Profesión"
              placeholder="Profesión"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
            />
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                Perfil profesional
              </label>
              <textarea
                id="bio"
                rows={3}
                placeholder="Perfil profesional"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </Card>

        {canLink && assignableRoles.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Roles</h3>{' '}
            <p className="text-sm text-gray-500 mb-3">
              Asigna uno o más roles al usuario en esta institución.
            </p>
            <div className="space-y-2">
              {assignableRoles.map((role) => (
                <label key={role.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-800">{role.name}</span>
                </label>
              ))}
            </div>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate('/admin/users')}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isPending}>
            Crear usuario
          </Button>
        </div>
      </form>
    </div>
  );
}
