import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🎓</span>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Agenda Escolar Digital</h1>
          <p className="text-sm text-gray-500 mt-1">Plataforma de gestión escolar</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
