import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type SkeletonCardKind = 'panel' | 'form' | 'chart';

interface SkeletonCardProps {
  /** Shape of the eventual content — drives the internal layout. */
  kind?: SkeletonCardKind;
  className?: string;
}

const HEIGHTS: Record<SkeletonCardKind, string> = {
  panel: 'h-64',
  form: 'h-72',
  chart: 'h-48',
};

// Renders a card-shaped skeleton matching the eventual content's footprint. Used by dashboard
// panels, detail-page sections, and chart blocks during initial fetch.
export function SkeletonCard({ kind = 'panel', className }: SkeletonCardProps) {
  return (
    <div
      className={cn('rounded-lg border bg-card p-4', className)}
      aria-busy="true"
      aria-live="polite"
    >
      {/* Title + help shimmer */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="size-4 rounded-full" />
      </div>
      {/* Body — sized to the kind */}
      <Skeleton className={cn('mt-4 w-full', HEIGHTS[kind])} />
    </div>
  );
}
