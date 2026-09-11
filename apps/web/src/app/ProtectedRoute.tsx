import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/auth.store';
import { LoadingPage } from '@/pages/LoadingPage';

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing, institutions, selectedInstitutionId } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (
    institutions.length > 1 &&
    !selectedInstitutionId &&
    location.pathname !== '/select-institution'
  ) {
    return <Navigate to="/select-institution" replace />;
  }

  return <Outlet />;
}
