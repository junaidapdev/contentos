import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/feedback';
import { feedbackMessages } from '@/components/feedback/messages';
import { ROUTES } from '@/constants/routes';
import { logger } from '@/lib/logger';

interface State {
  hasError: boolean;
  /** Bumped on retry — used as `key` on the child wrapper to force a fresh subtree. */
  errorKey: number;
}

interface Props {
  children: ReactNode;
}

// Route-level error boundary. Wraps <AppShell>'s <Outlet /> so a thrown exception inside a
// feature component does NOT take down the sidebar nav — the user can keep navigating elsewhere.
//
// The recovery screen offers two paths:
//   1. Try again — remounts the child subtree by bumping `errorKey` (state in the failing
//      component is lost; that's documented in /context/decisions.md as an MVP trade-off).
//   2. Go to dashboard — a hard-link out of the failing route.
//
// We log the message + truncated stack + componentStack via the logger (which respects the
// no-`console.*` rule). PII is not collected — only error metadata.
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('route_error_boundary_caught', {
      message: error.message,
      // Truncated so a runaway stack doesn't bloat the log payload.
      stack: error.stack?.slice(0, 1000),
      componentStack: info.componentStack?.slice(0, 1000),
    });
  }

  handleRetry = (): void => {
    this.setState((s) => ({ hasError: false, errorKey: s.errorKey + 1 }));
  };

  render(): ReactNode {
    const m = feedbackMessages.routeErrorBoundary;
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-3xl px-6 py-12">
          <ErrorState title={m.title} body={m.body} onRetry={this.handleRetry} />
          <div className="mt-4 flex justify-center">
            <Button asChild variant="ghost">
              <Link to={ROUTES.DASHBOARD}>{m.goDashboard}</Link>
            </Button>
          </div>
        </div>
      );
    }
    // Keying on errorKey forces React to remount the subtree when the user clicks "Try again",
    // which discards any internal state that contributed to the failure.
    return <div key={this.state.errorKey}>{this.props.children}</div>;
  }
}
