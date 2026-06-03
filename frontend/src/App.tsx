import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { HomePage } from '@/components/HomePage';
import { NotFoundPage } from '@/components/NotFoundPage';
import { RequireAuth } from '@/components/guards/RequireAuth';
import { RequireOnboarded } from '@/components/guards/RequireOnboarded';
import { AppShell } from '@/layouts/AppShell';
import { SignInPage } from '@/features/auth/SignInPage';
import { SignUpPage } from '@/features/auth/SignUpPage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ContentItemsListPage } from '@/features/content-items/ContentItemsListPage';
import { NewContentItemPage } from '@/features/content-items/NewContentItemPage';
import { ContentItemDetailPage } from '@/features/content-items/ContentItemDetailPage';
import { IdeasListPage } from '@/features/ideas/IdeasListPage';
import { NewIdeaPage } from '@/features/ideas/NewIdeaPage';
import { IdeaDetailPage } from '@/features/ideas/IdeaDetailPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { BrandContextListPage } from '@/features/brand-context/BrandContextListPage';
import { NewBrandContextFilePage } from '@/features/brand-context/NewBrandContextFilePage';
import { ExportPackPage } from '@/features/brand-context/ExportPackPage';
import { BrandContextDetailPage } from '@/features/brand-context/BrandContextDetailPage';
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
            children: [
              { path: ROUTES.DASHBOARD, element: <DashboardPage /> },
              {
                path: ROUTES.CONTENT_ITEMS,
                children: [
                  { index: true, element: <ContentItemsListPage /> },
                  { path: 'new', element: <NewContentItemPage /> },
                  { path: ':id', element: <ContentItemDetailPage /> },
                ],
              },
              {
                path: ROUTES.IDEAS,
                children: [
                  { index: true, element: <IdeasListPage /> },
                  { path: 'new', element: <NewIdeaPage /> },
                  { path: ':id', element: <IdeaDetailPage /> },
                ],
              },
              { path: ROUTES.CALENDAR, element: <CalendarPage /> },
              {
                path: ROUTES.BRAND_CONTEXT,
                children: [
                  { index: true, element: <BrandContextListPage /> },
                  { path: 'new', element: <NewBrandContextFilePage /> },
                  { path: 'export', element: <ExportPackPage /> },
                  { path: ':id', element: <BrandContextDetailPage /> },
                ],
              },
            ],
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
