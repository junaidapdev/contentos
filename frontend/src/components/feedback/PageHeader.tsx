import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

interface Breadcrumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned action area (e.g., "+ New item" button). */
  actions?: ReactNode;
  /** Optional breadcrumb trail rendered above the title. The last item is the current page (label only). */
  breadcrumbs?: Breadcrumb[];
  className?: string;
}

// Standardized page header for every signed-in feature page. The <h1> here is what the
// `useFocusOnRouteChange` hook focuses on route change — so it MUST be the only h1 on the page.
//
// Heading scale (per chunk-12 visual consistency checklist):
//   h1 = text-2xl font-semibold
//   h2 = text-xl font-medium       (used in detail-page sections)
//   h3 = text-lg font-medium       (sub-sections)
export function PageHeader({ title, subtitle, actions, breadcrumbs, className }: PageHeaderProps) {
  return (
    <header className={cn('space-y-2', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <Fragment key={`${crumb.label}-${String(index)}`}>
                  <li>
                    {crumb.to && !isLast ? (
                      <Link
                        to={crumb.to}
                        className="hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current={isLast ? 'page' : undefined}>{crumb.label}</span>
                    )}
                  </li>
                  {!isLast && (
                    <li aria-hidden="true" className="text-muted-foreground/60">
                      /
                    </li>
                  )}
                </Fragment>
              );
            })}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          {/*
           * The hook adds tabindex="-1" + focus()s the first h1 in <main>. Keep the heading text
           * concise; the screen reader announces it on every navigation.
           */}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
