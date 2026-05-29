import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import { APP_SHELL_MESSAGES, COMMON_MESSAGES, NAV_ITEMS } from '@/constants/messages';
import { useSignOut } from '@/features/auth/useSignOut';
import { authErrorMessage, authMessages } from '@/features/auth/messages';
import { toErrorCode } from '@/features/auth/auth-errors';

// Authenticated layout: sidebar nav + content area. (Full mobile hamburger drawer is deferred — this
// is a placeholder shell; Chunk 04+ flesh out the nav and views.)
export function AppShell() {
  const navigate = useNavigate();
  const signOut = useSignOut();

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

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-4 text-lg font-semibold">{COMMON_MESSAGES.appName}</div>
        <nav className="flex-1 space-y-1 px-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-2">
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
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
