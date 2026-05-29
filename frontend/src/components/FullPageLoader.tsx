import { Loader2Icon } from 'lucide-react';
import { COMMON_MESSAGES } from '@/constants/messages';

// Neutral full-screen loading state used by route guards so protected content never flickers
// before a redirect decision is made.
export function FullPageLoader() {
  return (
    <div
      className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground"
      role="status"
      aria-busy="true"
    >
      <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
      <span className="text-sm">{COMMON_MESSAGES.loading}</span>
    </div>
  );
}
