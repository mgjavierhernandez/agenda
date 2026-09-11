import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/auth.store';
import { getErrorMessage } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Spinner } from '@/components/ui/Spinner';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err) || 'Credenciales inválidas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    setError('');
    setIsGoogleLoading(true);
    const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
    window.location.href = `${apiUrl}/auth/google`;
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Demo1234!');
    setError('');
    setIsSubmitting(true);
    try {
      await login(demoEmail, 'Demo1234!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err) || 'Error al iniciar sesión de demostración');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Iniciar sesión</h1>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={isSubmitting || isGoogleLoading}
        />
        <PasswordInput
          label="Contraseña"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={isSubmitting || isGoogleLoading}
        />
        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
            role="alert"
          >
            {error}
          </div>
        )}
        <Button
          type="submit"
          isLoading={isSubmitting}
          className="w-full"
          disabled={isGoogleLoading}
        >
          Entrar
        </Button>
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2 font-medium">Accesos rápidos de demostración:</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-xs truncate"
              onClick={() => handleQuickLogin('superadmin@agenda.dev')}
              disabled={isSubmitting || isGoogleLoading}
            >
              Demo Admin
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-xs truncate"
              onClick={() => handleQuickLogin('teacher@demo-school.dev')}
              disabled={isSubmitting || isGoogleLoading}
            >
              Demo Docente
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={isSubmitting || isGoogleLoading}
          isLoading={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Redirigiendo a Google...
            </>
          ) : (
            'Continuar con Google'
          )}
        </Button>
        <p className="text-sm text-gray-500 text-center">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-800">
            Solicita acceso
          </Link>
        </p>
      </form>
    </div>
  );
}
