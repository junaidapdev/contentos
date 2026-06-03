import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonFormProps {
  /** How many field rows to render. Default 4 — matches the average form length across features. */
  fieldCount?: number;
  className?: string;
}

// Renders a skeleton shaped like a form — label + control + helper, repeated `fieldCount` times,
// followed by a submit-button shimmer. Used by detail pages and edit flows during initial fetch.
export function SkeletonForm({ fieldCount = 4, className }: SkeletonFormProps) {
  return (
    <div className={cn('space-y-5', className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: fieldCount }).map((_unused, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
      <Skeleton className="h-9 w-32 rounded-md" />
    </div>
  );
}
