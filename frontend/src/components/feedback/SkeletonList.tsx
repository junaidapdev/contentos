import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FEEDBACK_TOKENS } from './feedback-tokens';

interface SkeletonListProps {
  /** How many rows to render. Default 5 — the typical list-page initial fetch is small. */
  rowCount?: number;
  /** Per-row height as a Tailwind class. Default matches the list-row height across features. */
  rowHeight?: string;
  className?: string;
}

// Renders a vertical stack of skeleton blocks shaped like the eventual list rows. Used by every
// list page (ideas, content items, brand context, …) during the first fetch.
export function SkeletonList({
  rowCount = 5,
  rowHeight = FEEDBACK_TOKENS.SKELETON_ROW_HEIGHT_DEFAULT,
  className,
}: SkeletonListProps) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rowCount }).map((_unused, index) => (
        <Skeleton key={index} className={cn('w-full rounded-lg', rowHeight)} />
      ))}
    </div>
  );
}
