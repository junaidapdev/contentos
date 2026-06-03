import { Link } from 'react-router-dom';
import { CornerUpLeftIcon } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { formatRelative } from '@/lib/datetime';
import { FORMAT_LABELS } from './format-options';
import { StatusBadge } from './StatusBadge';
import { contentItemMessages } from './messages';
import type { ContentItemListEntry } from './useContentItemsList';

interface ContentItemListRowProps {
  item: ContentItemListEntry;
  platformLabel: string | null;
  pillarLabel: string | null;
}

interface MetaBadgeProps {
  label: string;
  tooltip: string;
}

// Small neutral-background badge used for all three relationship-count signals. Order on the row
// (cross-post → siblings → repurposed children) matches the order they were introduced in the
// codebase; if the row gets visually busy, tighten gap-x.
function MetaBadge({ label, tooltip }: MetaBadgeProps) {
  return (
    <span
      className="inline-flex max-w-[12rem] items-center truncate rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
      title={tooltip}
    >
      {label}
    </span>
  );
}

export function ContentItemListRow({ item, platformLabel, pillarLabel }: ContentItemListRowProps) {
  const m = contentItemMessages.list;
  const dash = m.dash;
  const { cross_post_group_size, sibling_group_size, repurposed_children_count } = item;
  const repurposedFromTitle = item.repurposed_from_parent_title;
  const repurposedFromId = item.repurposed_from_parent_id;

  return (
    <Link
      to={ROUTES.contentItemDetail(item.id)}
      className="flex items-start justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{item.title}</p>

        {/* "↑ from: …" line — third-priority tertiary. Renders only when the row is a repurposed
            child. Truncates with the title to keep the row a stable height when long. */}
        {repurposedFromId && repurposedFromTitle && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <CornerUpLeftIcon className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {m.repurposedFromPrefix} {repurposedFromTitle}
            </span>
          </p>
        )}

        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
          <span>{FORMAT_LABELS[item.format]}</span>
          <span aria-hidden="true">·</span>
          <span>{platformLabel ?? dash}</span>
          {cross_post_group_size > 1 && (
            <MetaBadge
              label={m.crossPostBadge(cross_post_group_size)}
              tooltip={m.crossPostBadgeTooltip(cross_post_group_size)}
            />
          )}
          {sibling_group_size > 1 && (
            <MetaBadge
              label={m.siblingBadge(sibling_group_size)}
              tooltip={m.siblingBadgeTooltip(sibling_group_size)}
            />
          )}
          {repurposed_children_count > 0 && (
            <MetaBadge
              label={m.repurposedChildrenBadge(repurposed_children_count)}
              tooltip={m.repurposedChildrenBadgeTooltip(repurposed_children_count)}
            />
          )}
          <span aria-hidden="true">·</span>
          <span>{pillarLabel ?? dash}</span>
        </p>

        {item.ideaTitle && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {m.fromIdeaPrefix} {item.ideaTitle}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge status={item.status} />
        <span className="text-xs text-muted-foreground">
          {m.updatedPrefix} {formatRelative(item.updated_at)}
        </span>
      </div>
    </Link>
  );
}
