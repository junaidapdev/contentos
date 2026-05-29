import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { FullPageLoader } from '@/components/FullPageLoader';
import { ROUTES } from '@/constants/routes';

// Gate for every non-public route. Shows a neutral loader until the session is resolved (no
// flicker of protected content), then redirects unauthenticated users to sign-in.
export function RequireAuth() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }
  if (!user) {
    return <Navigate to={ROUTES.SIGN_IN} replace />;
  }
  return <Outlet />;
}
