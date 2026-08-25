import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <span className="text-6xl mb-4">🔍</span>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Página no encontrada</h1>
      <p className="text-gray-500 mb-6">El recurso solicitado no existe.</p>
      <Link to="/dashboard">
        <Button>Volver al dashboard</Button>
      </Link>
    </div>
  );
}
