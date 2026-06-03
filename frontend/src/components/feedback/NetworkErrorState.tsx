import { WifiOffIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FEEDBACK_TOKENS } from './feedback-tokens';
import { feedbackMessages } from './messages';

interface NetworkErrorStateProps {
  onRetry?: () => void;
  className?: string;
}

// Distinct visual + copy treatment for transport-layer failures (typically `TypeError: Failed to
// fetch`). Surfaced via the `isNetworkError(error)` helper in lib/network-error.ts. "Try again"
// makes semantic sense here — unlike VALIDATION_FAILED, where retry would just fail again.
export function NetworkErrorState({ onRetry, className }: NetworkErrorStateProps) {
  const m = feedbackMessages.networkErrorState;
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-center text-amber-900',
        FEEDBACK_TOKENS.ERROR_STATE_PADDING,
        'px-6',
        className,
      )}
    >
      <WifiOffIcon className="size-8 text-amber-700" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-medium">{m.title}</h2>
      <p className={cn('mt-1 text-sm', FEEDBACK_TOKENS.EMPTY_STATE_MAX_WIDTH)}>{m.body}</p>
      {onRetry && (
        <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
          {m.retry}
        </Button>
      )}
    </div>
  );
}
