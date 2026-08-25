import { useAuth } from '@/auth/auth.store';
import { getErrorMessage } from '@/api/errors';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

export function InstitutionSelectPage() {
  const { institutions, selectInstitution } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = async () => {
    if (!selectedId) return;
    setError('');
    setIsLoading(true);
    try {
      await selectInstitution(selectedId);
    } catch (err) {
      setError(getErrorMessage(err) || 'Error selecting institution');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Seleccionar institución</h2>
      <p className="text-sm text-gray-500 mb-6">Elige la institución con la que deseas trabajar.</p>
      <div className="space-y-3 mb-6">
        {institutions.map((inst) => (
          <button
            key={inst.id}
            onClick={() => setSelectedId(inst.id)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
              selectedId === inst.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="font-medium text-gray-900">{inst.name}</div>
            <div className="text-sm text-gray-500 mt-0.5">{inst.slug}</div>
          </button>
        ))}
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4" role="alert">
          {error}
        </div>
      )}
      <Button onClick={handleSelect} disabled={!selectedId} isLoading={isLoading} className="w-full">
        Continuar
      </Button>
    </div>
  );
}
