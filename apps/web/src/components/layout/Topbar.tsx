import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/auth.store';
import { useTenant } from '@/tenant/tenant.store';
import { useNotifications } from '@/modules/notifications';
import { ChildSelector } from '@/modules/children';
import { Avatar } from '@/components/ui/Avatar';

interface TopbarProps {
  onMenuToggle: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, institutions, selectedInstitutionId, selectInstitution, logout } = useAuth();
  const { selectedInstitution } = useTenant();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInstMenu, setShowInstMenu] = useState(false);

  const { data: notifData } = useNotifications({ limit: 1, status: 'UNREAD' });
  const unreadCount = notifData?.unreadCount ?? 0;

  const otherInstitutions = institutions.filter((i) => i.id !== selectedInstitutionId);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowUserMenu(false);
      setShowInstMenu(false);
    }
  }, []);

  useEffect(() => {
    if (showUserMenu || showInstMenu) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showUserMenu, showInstMenu, handleEscape]);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowInstMenu(!showInstMenu)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
            aria-expanded={showInstMenu}
            aria-haspopup="true"
            aria-label="Cambiar institución"
          >
            <span aria-hidden="true">🏫</span>
            <span className="hidden sm:inline">
              {selectedInstitution?.name || 'Select institution'}
            </span>
            {otherInstitutions.length > 0 && (
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </button>
          {showInstMenu && otherInstitutions.length > 0 && (
            <div
              role="menu"
              className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
            >
              {otherInstitutions.map((inst) => (
                <button
                  key={inst.id}
                  role="menuitem"
                  onClick={() => {
                    selectInstitution(inst.id);
                    setShowInstMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {inst.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <ChildSelector />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg hover:bg-gray-100"
          aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ''}`}
        >
          <svg
            className="h-6 w-6 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white min-w-[18px]"
              aria-hidden="true"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
            aria-expanded={showUserMenu}
            aria-haspopup="true"
            aria-label="Menú de usuario"
          >
            <Avatar name={user?.email || 'U'} size="sm" />
            <span className="hidden sm:inline text-sm text-gray-700">{user?.email}</span>
          </button>
          {showUserMenu && (
            <div
              role="menu"
              className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
            >
              <button
                role="menuitem"
                onClick={() => {
                  logout();
                  setShowUserMenu(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
