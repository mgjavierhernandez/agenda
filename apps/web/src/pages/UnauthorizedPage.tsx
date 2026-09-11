import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <span className="text-6xl mb-4" aria-hidden="true">
        🔒
      </span>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Acceso no autorizado</h1>
      <p className="text-gray-500 mb-6">No tienes permisos para realizar esta acción.</p>
      <Link
        to="/dashboard"
        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Volver al dashboard
      </Link>
    </main>
  );
}
