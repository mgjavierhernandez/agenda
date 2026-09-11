import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelfRegister } from '@/modules/administration/hooks';
import { getErrorMessage } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import {
  DOCUMENT_TYPE_LABELS,
  SELF_REGISTER_ROLE_LABELS,
  type DocumentType,
  type SelfRegisterRole,
} from '@/api/types';

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const selfRegister = useSelfRegister();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institutionSlug, setInstitutionSlug] = useState(searchParams.get('i') ?? '');
  const [requestedRole, setRequestedRole] = useState<SelfRegisterRole | ''>('');
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if ((documentType && !documentNumber.trim()) || (!documentType && documentNumber.trim())) {
      setError('El tipo y el número de documento deben indicarse juntos');
      return;
    }
    try {
      await selfRegister.mutateAsync({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        institutionSlug: institutionSlug.trim(),
        requestedRole: requestedRole as SelfRegisterRole,
        ...((documentType && documentNumber.trim()) || phone.trim() || profession.trim()
          ? {
              profile: {
                ...(documentType && documentNumber.trim()
                  ? { documentType, documentNumber: documentNumber.trim() }
                  : {}),
                ...(phone.trim() ? { phone: phone.trim() } : {}),
                ...(profession.trim() ? { profession: profession.trim() } : {}),
              },
            }
          : {}),
      });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err) || 'No fue posible enviar la solicitud');
    }
  };

  if (done) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Solicitud recibida</h1>
        <p className="text-sm text-gray-600 mb-6">
          Tu solicitud de acceso quedó pendiente de aprobación por el administrador de la
          institución. Te avisaremos cuando sea aprobada.
        </p>
        <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-800">
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Solicitar acceso</h1>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre"
            placeholder="Nombre"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            label="Apellido"
            placeholder="Apellido"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <PasswordInput
          label="Contraseña"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <Input
          label="Institución (código)"
          placeholder="Ej: antonio-narino"
          value={institutionSlug}
          onChange={(e) => setInstitutionSlug(e.target.value)}
          required
        />
        <div>
          <label htmlFor="requestedRole" className="block text-sm font-medium text-gray-700 mb-1">
            Soy
            <span className="text-red-500 ml-1" aria-hidden="true">
              *
            </span>
          </label>
          <select
            id="requestedRole"
            required
            value={requestedRole}
            onChange={(e) => setRequestedRole(e.target.value as SelfRegisterRole | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccione…</option>
            {(Object.keys(SELF_REGISTER_ROLE_LABELS) as SelfRegisterRole[]).map((r) => (
              <option key={r} value={r}>
                {SELF_REGISTER_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 mb-1">
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
          <Input
            label="Número de documento"
            placeholder="Número de documento"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Teléfono"
            placeholder="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Profesión"
            placeholder="Profesión"
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
          />
        </div>
        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
            role="alert"
          >
            {error}
          </div>
        )}
        <Button type="submit" isLoading={selfRegister.isPending} className="w-full">
          Enviar solicitud
        </Button>
        <p className="text-sm text-gray-500 text-center">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-800">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
