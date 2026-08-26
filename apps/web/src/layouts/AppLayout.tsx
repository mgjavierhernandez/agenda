import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [mobileMenuOpen, handleEscape]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
        Saltar al contenido principal
      </a>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        <div className="flex items-center gap-2 px-4 h-16 border-b border-gray-200">
          <span className="text-xl" aria-hidden="true">🎓</span>
          <span className="font-bold text-gray-900">Agenda Escolar</span>
        </div>
        <Sidebar isMobile onNavigate={() => setMobileMenuOpen(false)} />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 bg-white border-r border-gray-200">
          <div className="flex items-center gap-2 px-4 h-16 border-b border-gray-200">
            <span className="text-xl" aria-hidden="true">🎓</span>
            <span className="font-bold text-gray-900">Agenda Escolar</span>
          </div>
          <Sidebar />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto focus:outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
