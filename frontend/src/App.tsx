import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { HomePage } from '@/components/HomePage';
import { NotFoundPage } from '@/components/NotFoundPage';
import { RequireAuth } from '@/components/guards/RequireAuth';
import { RequireOnboarded } from '@/components/guards/RequireOnboarded';
import { AppShell } from '@/layouts/AppShell';
import { SignInPage } from '@/features/auth/SignInPage';
import { SignUpPage } from '@/features/auth/SignUpPage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { DashboardPlaceholder } from '@/features/dashboard/DashboardPlaceholder';
import { ROUTES } from '@/constants/routes';

const router = createBrowserRouter([
  { path: ROUTES.HOME, element: <HomePage /> },
  { path: ROUTES.SIGN_IN, element: <SignInPage /> },
  { path: ROUTES.SIGN_UP, element: <SignUpPage /> },
  {
    // Everything below requires a session.
    element: <RequireAuth />,
    children: [
      { path: ROUTES.ONBOARDING, element: <OnboardingPage /> },
      {
        // Post-onboarding routes additionally require completed onboarding + the app shell.
        element: <RequireOnboarded />,
        children: [
          {
            element: <AppShell />,
            children: [{ path: ROUTES.DASHBOARD, element: <DashboardPlaceholder /> }],
          },
        ],
      },
    ],
  },
  { path: ROUTES.NOT_FOUND, element: <NotFoundPage /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
