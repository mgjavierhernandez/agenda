import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { getErrorMessage } from '@/api/errors';
import { Spinner } from '@/components/ui/Spinner';
import { Link } from 'react-router-dom';

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'not-configured'>(
    'loading',
  );
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const err = searchParams.get('error');
      const errDesc = searchParams.get('error_description');

      if (err) {
        const normalized = (err || '').toLowerCase();
        if (normalized.includes('not-configured') || normalized.includes('not_configured')) {
          setStatus('not-configured');
          setError(errDesc || 'Google OAuth no está configurado en el servidor');
        } else {
          setStatus('error');
          setError(errDesc || err || 'Error en la autenticación con Google');
        }
        return;
      }

      if (accessToken && refreshToken) {
        try {
          apiClient.setAccessToken(accessToken);
          sessionStorage.setItem('agenda_access_token', accessToken);
          sessionStorage.setItem('agenda_refresh_token', refreshToken);

          const profile = await apiClient.get<{ id: string; email: string; status: string }>(
            '/auth/profile',
          );
          void profile;
          const insts = await apiClient.get<{ institutions: { id: string }[] }>(
            '/auth/institutions',
          );

          if (insts.institutions.length === 1) {
            await apiClient.post('/auth/tenant/select', {
              institutionId: insts.institutions[0].id,
            });
            try {
              sessionStorage.setItem('agenda_institution_id', insts.institutions[0].id);
              apiClient.setInstitutionId(insts.institutions[0].id);
            } catch {
              // storage unavailable
            }
          }

          setStatus('success');
          // Recargar para que AuthProvider restaure sesión (tokens + institución)
          setTimeout(() => window.location.replace('/dashboard'), 1500);
        } catch (err) {
          setStatus('error');
          setError(getErrorMessage(err) || 'Error al completar el inicio de sesión');
        }
      } else {
        setStatus('error');
        setError('Respuesta de autenticación incompleta');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-gray-900">Completando inicio de sesión...</h1>
          <p className="text-sm text-gray-500 mt-2">Redirigiendo desde Google</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">¡Inicio de sesión exitoso!</h1>
          <p className="text-sm text-gray-500 mt-2">Redirigiendo al panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-md w-full mx-4">
        {status === 'not-configured' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-amber-800 mb-2">Google no configurado</h2>
            <p className="text-sm text-amber-700">
              El administrador no ha configurado las credenciales de Google OAuth. Por favor, use el
              inicio de sesión con correo y contraseña.
            </p>
          </div>
        )}
        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6" role="alert">
            <h2 className="font-semibold text-red-800 mb-2">Error de autenticación</h2>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <div className="text-center">
          <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-800">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
