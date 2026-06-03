import { AlertOctagonIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FEEDBACK_TOKENS } from './feedback-tokens';
import { feedbackMessages } from './messages';

interface ErrorStateProps {
  title: string;
  body?: string;
  /** When provided, renders a "Try again" button calling this handler. */
  onRetry?: () => void;
  /** Optional stable error code shown in monospace below the body — helps support diagnose. */
  code?: string;
  className?: string;
}

// Full-panel error treatment. Used when a query fails (page or panel-level). For inline mutation
// errors, keep using the existing destructive <Alert> pattern — those are not full-panel.
export function ErrorState({ title, body, onRetry, code, className }: ErrorStateProps) {
  const m = feedbackMessages.errorState;
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 text-center',
        FEEDBACK_TOKENS.ERROR_STATE_PADDING,
        'px-6',
        className,
      )}
    >
      <AlertOctagonIcon className="size-8 text-destructive" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-medium">{title}</h2>
      {body && (
        <p className={cn('mt-1 text-sm text-muted-foreground', FEEDBACK_TOKENS.EMPTY_STATE_MAX_WIDTH)}>
          {body}
        </p>
      )}
      {code && (
        <p className="mt-2 font-mono text-xs text-muted-foreground" aria-label={m.codeAria(code)}>
          {code}
        </p>
      )}
      {onRetry && (
        <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
          {m.retry}
        </Button>
      )}
    </div>
  );
}
