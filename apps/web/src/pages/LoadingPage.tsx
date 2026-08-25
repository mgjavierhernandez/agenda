import { Spinner } from '@/components/ui/Spinner';

export function LoadingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <Spinner size="lg" />
      <p className="mt-4 text-sm text-gray-500">Cargando...</p>
    </div>
  );
}
