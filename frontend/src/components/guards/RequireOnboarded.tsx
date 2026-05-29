import { Navigate, Outlet } from 'react-router-dom';
import { useOnboardingStatus } from '@/features/onboarding/useOnboardingStatus';
import { FullPageLoader } from '@/components/FullPageLoader';
import { ROUTES } from '@/constants/routes';

// Gate for post-onboarding routes. Always rendered inside RequireAuth (so a user exists). Shows a
// neutral loader while the derived onboarding status resolves, then redirects to /onboarding if the
// user has not yet added a platform + a pillar. (The inverse redirect — onboarded user visiting
// /onboarding → /dashboard — lives in OnboardingPage to keep this guard's contract simple.)
export function RequireOnboarded() {
  const { data, isLoading } = useOnboardingStatus();

  if (isLoading) {
    return <FullPageLoader />;
  }
  if (!data?.isOnboarded) {
    return <Navigate to={ROUTES.ONBOARDING} replace />;
  }
  return <Outlet />;
}
