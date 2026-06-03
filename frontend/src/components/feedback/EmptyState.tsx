import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FEEDBACK_TOKENS } from './feedback-tokens';

interface EmptyStateCta {
  label: string;
  // Either a click handler or a route (mutually exclusive). When `to` is set the CTA renders as a
  // Link, when `onClick` is set it renders as a Button.
  onClick?: () => void;
  to?: string;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  body?: string;
  /** The single dominant action. Per chunk-12 decisions, every empty state has exactly one primary CTA. */
  primaryCta?: EmptyStateCta;
  /** Optional secondary action for the explicit two-CTA case (e.g., dashboard first-run). */
  secondaryCta?: EmptyStateCta;
  className?: string;
}

// Renders the standard empty state — dashed-border panel, centered icon + title + body, max-width
// constrained copy column, and one or two CTAs below. See /context/05-ui-context.md "Empty States"
// and the chunk-12 decisions entry for the one-primary-CTA rule.
export function EmptyState({ icon, title, body, primaryCta, secondaryCta, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed text-center',
        FEEDBACK_TOKENS.EMPTY_STATE_PADDING,
        className,
      )}
    >
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <h2 className={cn(icon ? 'mt-3' : '', 'text-lg font-medium')}>{title}</h2>
      {body && (
        <p className={cn('mt-1 text-sm text-muted-foreground', FEEDBACK_TOKENS.EMPTY_STATE_MAX_WIDTH)}>
          {body}
        </p>
      )}
      {(primaryCta ?? secondaryCta) && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
          {secondaryCta && <EmptyStateCtaButton cta={secondaryCta} variant="outline" />}
          {primaryCta && <EmptyStateCtaButton cta={primaryCta} variant="default" />}
        </div>
      )}
    </div>
  );
}

function EmptyStateCtaButton({
  cta,
  variant,
}: {
  cta: EmptyStateCta;
  variant: 'default' | 'outline';
}) {
  if (cta.to) {
    return (
      <Button asChild variant={variant}>
        <Link to={cta.to}>{cta.label}</Link>
      </Button>
    );
  }
  return (
    <Button variant={variant} onClick={cta.onClick}>
      {cta.label}
    </Button>
  );
}
