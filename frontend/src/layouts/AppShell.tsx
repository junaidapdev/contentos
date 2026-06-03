import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { MenuIcon, XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { useFocusOnRouteChange } from '@/lib/use-focus-on-route-change';
import { APP_SHELL_MESSAGES, COMMON_MESSAGES, NAV_ITEMS } from '@/constants/messages';
import { ROUTES } from '@/constants/routes';
import { useSignOut } from '@/features/auth/useSignOut';
import { authErrorMessage, authMessages } from '@/features/auth/messages';
import { toErrorCode } from '@/features/auth/auth-errors';

// Authenticated layout: sidebar nav + content area.
//
// Chunk-12 polish:
//   - Mobile hamburger drawer (slide-over sheet) for <md viewports.
//   - Active link gets a left-border accent in addition to background tint (no color-alone).
//   - <main> wraps <Outlet /> inside <RouteErrorBoundary> so feature exceptions don't take down
//     the sidebar.
//   - useFocusOnRouteChange moves focus to the new page's <h1> on every navigation.
export function AppShell() {
  const navigate = useNavigate();
  const signOut = useSignOut();
  useFocusOnRouteChange();

  // Mobile drawer open state. Closed by navigation (via the NavLink's onClick callback) and by
  // the X / scrim controls below — NOT via a useEffect on location.pathname (the React 19 hook
  // lint rule `react-hooks/set-state-in-effect` rejects that pattern; closing on click avoids the
  // effect entirely and gives the same UX).
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = (): void => {
    setDrawerOpen(false);
  };

  const handleSignOut = (): void => {
    signOut.mutate(undefined, {
      onSuccess: () => {
        toast.success(authMessages.signOut.success);
        navigate(ROUTES.SIGN_IN);
      },
      onError: (error: unknown) => {
        toast.error(authErrorMessage(toErrorCode(error)));
      },
    });
  };

  const signOutButton = (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start"
      disabled={signOut.isPending}
      aria-busy={signOut.isPending}
      onClick={handleSignOut}
    >
      {signOut.isPending ? APP_SHELL_MESSAGES.signingOut : APP_SHELL_MESSAGES.signOut}
    </Button>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile top bar — hamburger + product name. Hidden on md+. */}
      <div className="flex items-center justify-between border-b bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <div className="text-base font-semibold">{COMMON_MESSAGES.appName}</div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={APP_SHELL_MESSAGES.openNav}
          aria-expanded={drawerOpen}
          onClick={() => {
            setDrawerOpen(true);
          }}
        >
          <MenuIcon className="size-5" aria-hidden="true" />
        </Button>
      </div>

      {/* Mobile slide-over drawer. Mounted only when drawerOpen on <md. */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={APP_SHELL_MESSAGES.navLandmark}
        >
          {/* Scrim */}
          <button
            type="button"
            aria-label={APP_SHELL_MESSAGES.closeNav}
            className="absolute inset-0 bg-black/40"
            onClick={closeDrawer}
          />
          {/* Sheet */}
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-lg font-semibold">{COMMON_MESSAGES.appName}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={APP_SHELL_MESSAGES.closeNav}
                onClick={closeDrawer}
              >
                <XIcon className="size-5" aria-hidden="true" />
              </Button>
            </div>
            <NavList onNavigate={closeDrawer} />
            <div className="border-t p-2">{signOutButton}</div>
          </div>
        </div>
      )}

      {/* Desktop sidebar — hidden on <md. */}
      <aside
        className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex"
        aria-label={APP_SHELL_MESSAGES.navLandmark}
      >
        <div className="px-5 py-4 text-lg font-semibold">{COMMON_MESSAGES.appName}</div>
        <NavList />
        <div className="border-t p-2">{signOutButton}</div>
      </aside>

      <main className="flex-1 overflow-auto">
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
    </div>
  );
}

// Extracted so the same list renders in the desktop sidebar AND the mobile drawer without
// duplicating the markup. NavLink active state adds a left-border accent — not color alone
// (per chunk-12 decisions). `onNavigate` fires before navigation completes so the drawer
// closes immediately (the desktop variant omits it).
function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 px-2 py-2">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === ROUTES.DASHBOARD}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'block rounded-md border-l-2 px-3 py-2 text-sm transition-colors',
              isActive
                ? 'border-foreground bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : 'border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
