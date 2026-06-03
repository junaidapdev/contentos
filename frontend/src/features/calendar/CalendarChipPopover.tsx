import { Link } from 'react-router-dom';
import { CornerUpLeftIcon, CornerUpRightIcon, LayersIcon, Share2Icon } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';
import { PopoverContent } from '@/components/ui/popover';
import { STATUS_LABELS } from '@/features/content-items/status-config';
import { StatusBadge } from '@/features/content-items/StatusBadge';
import { FORMAT_LABELS } from '@/features/content-items/format-options';
import type { CalendarChipItem } from './calendar-grouping';
import { formatLongDate, formatTime } from './calendar-date-utils';
import { calendarMessages } from './messages';

interface CalendarChipPopoverProps {
  item: CalendarChipItem;
  platformLabel: string | null;
  pillarLabel: string | null;
  onClose: () => void;
}

// Popover content for one chip. Compact summary of the item's metadata + a link to its detail
// page. Reuses StatusBadge (Chunk 04) and the format/messages dictionaries. Relationship lines
// only render when the underlying aggregate is non-zero — clean cards for plain items.
export function CalendarChipPopover({
  item,
  platformLabel,
  pillarLabel,
  onClose,
}: CalendarChipPopoverProps) {
  const m = calendarMessages.popover;
  const dateLabel = `${formatLongDate(item.renderedAt)}, ${formatTime(item.renderedAt)}`;

  return (
    <PopoverContent className="w-80" align="start">
      <div className="space-y-3">
        <div>
          <Link
            to={ROUTES.contentItemDetail(item.id)}
            className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {item.title}
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={item.status} />
            <span className="text-xs text-muted-foreground">{FORMAT_LABELS[item.format]}</span>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-1 text-xs">
          <dt className="text-muted-foreground">{m.dateLabel}</dt>
          <dd className="col-span-2">{dateLabel}</dd>
          {platformLabel && (
            <>
              <dt className="text-muted-foreground">{m.platformLabel}</dt>
              <dd className="col-span-2">{platformLabel}</dd>
            </>
          )}
          {pillarLabel && (
            <>
              <dt className="text-muted-foreground">{m.pillarLabel}</dt>
              <dd className="col-span-2">{pillarLabel}</dd>
            </>
          )}
        </dl>

        {(item.cross_post_group_size > 1 ||
          item.sibling_group_size > 1 ||
          item.repurposed_children_count > 0 ||
          item.repurposed_from_parent_id !== null) && (
          <ul className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
            {item.cross_post_group_size > 1 && (
              <li className="flex items-center gap-1.5">
                <Share2Icon className="size-3 shrink-0" aria-hidden="true" />
                {m.relationships.crossPost(item.cross_post_group_size)}
              </li>
            )}
            {item.sibling_group_size > 1 && (
              <li className="flex items-center gap-1.5">
                <LayersIcon className="size-3 shrink-0" aria-hidden="true" />
                {m.relationships.sibling(item.sibling_group_size)}
              </li>
            )}
            {item.repurposed_from_parent_id && item.repurposed_from_parent_title && (
              <li className="flex items-center gap-1.5">
                <CornerUpLeftIcon className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {m.relationships.repurposedFrom(item.repurposed_from_parent_title)}
                </span>
              </li>
            )}
            {item.repurposed_children_count > 0 && (
              <li className="flex items-center gap-1.5">
                <CornerUpRightIcon className="size-3 shrink-0" aria-hidden="true" />
                {m.relationships.repurposedInto(item.repurposed_children_count)}
              </li>
            )}
          </ul>
        )}

        <div className="flex justify-between gap-2 border-t pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {m.closeCta}
          </Button>
          <Button asChild size="sm">
            <Link
              to={ROUTES.contentItemDetail(item.id)}
              aria-label={`${m.openCta}: ${item.title}`}
            >
              {m.openCta}
            </Link>
          </Button>
        </div>
      </div>

      {/* Screen reader: announce status name even though it's also rendered as a colored badge. */}
      <span className="sr-only">{STATUS_LABELS[item.status]}</span>
    </PopoverContent>
  );
}
