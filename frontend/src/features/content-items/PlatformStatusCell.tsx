import { Link } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import type { ContentItem } from '@shared/schemas/content-item';
import { StatusBadge } from './StatusBadge';
import { contentItemMessages } from './messages';

interface PlatformStatusCellProps {
  platformLabel: string;
  // If set, this platform is covered by a variant; clicking navigates to its detail page.
  variant?: ContentItem;
  // If true, this platform is "Missing" — render the dashed-border CTA cell that opens the dialog.
  isMissing?: boolean;
  // If isMissing, called with no args. The parent attaches the platform id from its own loop state.
  onAddMissing?: () => void;
  // Whether this cell represents the source variant (gets a "Source" tag).
  isSource?: boolean;
}

export function PlatformStatusCell({
  platformLabel,
  variant,
  isMissing = false,
  onAddMissing,
  isSource = false,
}: PlatformStatusCellProps) {
  const m = contentItemMessages.crossPost;

  if (isMissing) {
    return (
      <button
        type="button"
        onClick={onAddMissing}
        aria-label={m.addToPlatformAria(platformLabel)}
        className={cn(
          'group flex flex-col items-start gap-1 rounded-md border border-dashed bg-muted/20 p-3 text-left transition-colors',
          'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <span className="text-sm font-medium">{platformLabel}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center rounded-full border border-dashed border-muted-foreground/40 px-2 py-0.5 font-medium uppercase tracking-wide">
            {m.missingLabel}
          </span>
          <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
            <PlusIcon className="size-3" aria-hidden="true" />
            {m.addCtaShort}
          </span>
        </span>
      </button>
    );
  }

  if (!variant) return null;

  return (
    <Link
      to={ROUTES.contentItemDetail(variant.id)}
      className="flex flex-col items-start gap-1 rounded-md border bg-card p-3 transition-colors hover:bg-muted/50"
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        {platformLabel}
        {isSource && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {m.sourceLabel}
          </span>
        )}
      </span>
      <StatusBadge status={variant.status} />
    </Link>
  );
}
