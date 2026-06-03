import { cn } from '@/lib/utils';
import type { ContentItemStatus } from '@shared/schemas/content-item';
import { STATUS_CLASSES, STATUS_LABELS } from './status-config';

interface StatusBadgeProps {
  status: ContentItemStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_CLASSES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
