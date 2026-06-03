import { Link } from 'react-router-dom';
import { CornerUpLeftIcon } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import type { ContentItem } from '@shared/schemas/content-item';
import { FORMAT_LABELS } from './format-options';
import { StatusBadge } from './StatusBadge';
import { contentItemMessages } from './messages';

interface RepurposeParentBlockProps {
  parent: ContentItem;
  // Optional platform label resolved by the caller (the panel has the platforms list cached).
  platformLabel: string | null;
}

// The "Repurposed from: …" block shown at the top of RepurposePanel when the current item is itself
// a repurposed child. Visually distinct from RepurposeChildrenList rows by the upward arrow icon
// and the "Source" tag — readers should recognize this as the lineage anchor, not just another row.
export function RepurposeParentBlock({ parent, platformLabel }: RepurposeParentBlockProps) {
  const m = contentItemMessages.repurpose;
  const dash = contentItemMessages.list.dash;
  return (
    <Link
      to={ROUTES.contentItemDetail(parent.id)}
      aria-label={m.parentLinkAria(parent.title)}
      className="flex items-start justify-between gap-3 rounded-md border-2 border-primary/20 bg-card p-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex min-w-0 items-start gap-2">
        <CornerUpLeftIcon
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {m.sourceLabel}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-medium">{parent.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {FORMAT_LABELS[parent.format]} · {platformLabel ?? dash}
          </p>
        </div>
      </div>
      <StatusBadge status={parent.status} />
    </Link>
  );
}
